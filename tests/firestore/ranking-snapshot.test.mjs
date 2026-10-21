import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createSnapshotProbe} from '../../scripts/experiments/ranking-snapshot.mjs'
import {estimatePage} from '../../scripts/experiments/ranking-model.mjs'
let env,probe
const date=n=>new Date(1700000000000+Math.floor(n/3)*1000),row=(n,patch={})=>({score:n%7,likes:n%6,createdAt:date(n),gameId:n%2?'g2':'g1',status:'published',...patch}),name=n=>'v'+String(n).padStart(2,'0')
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081}});probe=createSnapshotProbe()})
beforeEach(async()=>{await env.clearFirestore();probe.resetStats()})
after(async()=>{await env?.cleanup()})
async function seed(count=37,overrides){await probe.store.transact(async tx=>{tx.set('rankingGames/g1',{status:'active'});tx.set('rankingGames/g2',{status:'active'});for(let i=0;i<count;i++)tx.set('rankingExperiments/'+name(i),row(i,overrides?.(i)??{}))})}
test('readTime preserva valores e conjunto após alteração/inclusão; precisão é conservada',async()=>{
 await seed(1,()=>({score:1,likes:1}));const first=await probe.query({mode:'relevant'})
 await probe.store.transact(async tx=>{tx.set('rankingExperiments/v00',row(0,{score:100}));tx.set('rankingExperiments/late',row(1,{score:200}))})
 const snapshot=await probe.query({mode:'relevant',readTime:first.readTime});assert.deepEqual(snapshot.items.map(r=>[r.id,r.data.score]),[['v00',1]]);assert.equal(snapshot.readTime,first.readTime)
 assert.deepEqual((await probe.query({mode:'relevant'})).items.map(r=>r.data.score),[200,100]);console.log('READ_TIME_PROOF '+JSON.stringify({historical:true,microsecondsPreserved:snapshot.readTime===first.readTime}))
})
test('quatro modos e três escopos paginam globalmente sem repetir/pular após mudanças',async()=>{
 for(const mode of ['latest','oldest','likes','relevant'])for(const gameId of [undefined,'g1','g2']){
  await env.clearFirestore();await seed();const baseline=Array.from({length:37},(_,n)=>({id:name(n),...row(n)})).filter(r=>!gameId||r.gameId===gameId)
  baseline.sort((a,b)=>mode==='oldest'?a.createdAt-b.createdAt||a.id.localeCompare(b.id):mode==='latest'?b.createdAt-a.createdAt||b.id.localeCompare(a.id):(mode==='likes'?b.likes-a.likes:b.score-a.score)||b.createdAt-a.createdAt||b.id.localeCompare(a.id))
  const first=await probe.query({mode,gameId});assert.equal(first.items.length,15)
  await probe.store.transact(async tx=>{tx.set('rankingExperiments/v00',row(0,{score:10000,likes:10000,createdAt:new Date()}));tx.set('rankingExperiments/late',row(99,{score:20000,likes:20000,gameId:gameId??'g1'}))})
  const ids=first.items.map(r=>r.id);let cursor=first.next,pages=1
  while(cursor){const page=await probe.query({mode,gameId,cursor});assert.equal(page.readTime,first.readTime);assert.ok(page.items.length<=15);ids.push(...page.items.map(r=>r.id));cursor=page.next;if(++pages>4)throw Error('pagina infinita')}
  assert.deepEqual(ids,baseline.map(r=>r.id),mode+':'+gameId);assert.equal(new Set(ids).size,ids.length)
 }
})
test('cursor não muda de modo/jogo; expiração força atualização antes de consultar',async()=>{
 await seed();const first=await probe.query({mode:'likes'});probe.resetStats()
 await assert.rejects(probe.query({mode:'relevant',cursor:first.next}),/invalid-cursor/);await assert.rejects(probe.query({mode:'likes',gameId:'g1',cursor:first.next}),/invalid-cursor/);assert.equal(probe.stats.queries,0)
 const future=createSnapshotProbe({now:()=>Date.now()+31*60000});await assert.rejects(future.query({mode:'likes',cursor:first.next}),/snapshot-expired/);assert.equal(future.stats.queries,0)
})
test('snapshot não reexibe removido/jogo banido; limite gera página parcial e continuação',async()=>{
 await seed(37,n=>({score:n,likes:n}));const start=await probe.query({mode:'likes'})
 await probe.store.transact(async tx=>{tx.set('rankingExperiments/v36',row(36,{status:'removed',likes:36}));tx.set('rankingGames/g2',{status:'banned'})});probe.resetStats()
 const first=await probe.visiblePage({mode:'likes',readTime:start.readTime});assert.equal(first.examined,30);assert.equal(first.items.length,14);assert.equal(first.limited,true);assert.ok(first.next);assert.ok(!first.items.includes('v36'));assert.ok(first.items.every(id=>Number(id.slice(1))%2===0))
 const observed=probe.stats.queryDocuments+probe.stats.currentShortReads+probe.stats.currentGameReads+1;assert.equal(observed,estimatePage({candidates:30,distinctGames:2}).documentReads)
 const second=await probe.visiblePage({mode:'likes',cursor:first.next});assert.equal(second.items.length,4);assert.equal(second.next,null);assert.equal(new Set([...first.items,...second.items]).size,18)
})
test('pior caso lê 30 candidatos + 30 shorts atuais + 30 jogos, nunca a coleção inteira',async()=>{
 await seed(31,n=>({score:n,likes:n,gameId:'g'+n}));await probe.store.transact(async tx=>{for(let n=0;n<31;n++)tx.set('rankingGames/g'+n,{status:n===0?'active':'hidden'})});probe.resetStats()
 const page=await probe.visiblePage({mode:'likes'});assert.equal(page.items.length,0);assert.equal(page.limited,true);assert.ok(page.next)
 assert.deepEqual(probe.stats,{queryDocuments:30,currentShortReads:30,currentGameReads:30,queries:2});assert.equal(probe.stats.queryDocuments+probe.stats.currentShortReads+probe.stats.currentGameReads+1,91)
 console.log('READ_BUDGET_PROOF '+JSON.stringify({...probe.stats,estimatedWithLimiter:91}))
 assert.deepEqual((await probe.visiblePage({mode:'likes',cursor:page.next})).items,['v00'])
})
test('orderBy omite legado sem campo: prova exige preparação e não pode habilitar ordenação parcial',async()=>{
 await probe.store.transact(async tx=>{tx.set('rankingExperiments/legacy',{createdAt:date(0),gameId:'g1',status:'published'});tx.set('rankingExperiments/current',row(1))})
 assert.equal((await probe.query({mode:'latest'})).items.length,2);assert.equal((await probe.query({mode:'likes'})).items.length,1);assert.equal((await probe.query({mode:'relevant'})).items.length,1)
 await probe.store.transact(async tx=>{const record=await tx.get('rankingExperiments/legacy');tx.set('rankingExperiments/legacy',{...record,likes:0,score:0})});assert.equal((await probe.query({mode:'likes'})).items.length,2)
})
test('consulta vazia retorna readTime e explicita mínimo de leitura e ausência de continuação',async()=>{
 const page=await probe.query({mode:'latest'});assert.deepEqual(page.items,[]);assert.equal(page.next,null);assert.ok(page.readTime);assert.equal(probe.stats.queryDocuments,1);assert.equal(probe.stats.queries,1)
})
