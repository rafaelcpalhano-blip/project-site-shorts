import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {readFile} from 'node:fs/promises'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {buildRankingGeneration,generationLimits} from '../../server/ranking/generation.ts'
import {prepareRanking} from '../../server/ranking/prepare.ts'
import {pruneRankingGeneration} from '../../server/ranking/retention.ts'
import {readOrderedFeed} from '../../server/ranking/read-feed.ts'
import {rankingScore} from '../../server/ranking/metrics.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),now=()=>new Date(),options={store,now};let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore()});after(async()=>{await env?.cleanup()})
const id=i=>'s'+String(i).padStart(3,'0')
async function seed(count=37){const at=now();await store.transact(async tx=>{
 for(const g of ['g1','g2'])tx.set('games/'+g,{officialName:g,source:'manual',status:'active',createdAt:new Date(at-300*3600000)})
 for(let i=0;i<count;i++){const gameId=i%2?'g2':'g1',shortId=id(i);tx.set('shorts/'+shortId,{gameId,title:'Jogada '+i,platform:'Twitch',platformVideoId:'GenerationClip'+i,normalizedUrl:'https://clips.twitch.tv/GenerationClip'+i,channelName:'Canal',moderationStatus:'published',createdAt:new Date(at-86400000-Math.floor(i/3)*1000),likeCount:i%5});tx.set('rankingMetrics/'+shortId,{version:1,ready:true,shortId,gameId,likeMass:Math.min(i%5,1),commentMass:0,commentContributors:0,asOf:new Date(at-3600000)})}
})}
test('preparação REST é idempotente, preserva contador e deixa falta de métricas explicitamente pendente',async()=>{
 await seed(2);const before=await store.get('shorts/s001');await store.transact(async tx=>{const row=await tx.get('shorts/s000');delete row.likeCount;tx.set('shorts/s000',row);tx.delete('rankingMetrics/s000')})
 assert.equal((await prepareRanking(options)).missingCounts,1);assert.equal((await store.get('shorts/s000')).likeCount,undefined)
 assert.equal((await prepareRanking({...options,apply:true})).changed,1);assert.equal((await store.get('shorts/s000')).likeCount,0);assert.equal((await store.get('rankingMetrics/s000')).ready,false);assert.deepEqual(await store.get('shorts/s001'),before);assert.equal((await prepareRanking({...options,apply:true})).changed,0)
 await assert.rejects(buildRankingGeneration(options),/metrics-not-ready/);assert.equal(await store.get('rankingState/current'),null)
})
test('geração completa e quatro consultas em três escopos têm paginação 15 e desempate correto',async()=>{
 await seed();const generation=await buildRankingGeneration(options),current=await store.get('rankingState/current');assert.equal(generation.itemCount,37);assert.equal(current.generationId,generation.generationId)
 const base=[];for(let i=0;i<37;i++){const short=await store.get('shorts/'+id(i)),game=await store.get('games/'+short.gameId),metric=await store.get('rankingMetrics/'+id(i));base.push({id:id(i),...short,score:rankingScore(short,game,metric,id(i),current.computedAt)})}
 for(const order of ['latest','oldest','likes','relevant'])for(const gameId of [undefined,'g1','g2']){
  const expected=base.filter(row=>!gameId||row.gameId===gameId).sort((a,b)=>order==='oldest'?a.createdAt-b.createdAt||a.id.localeCompare(b.id):order==='latest'?b.createdAt-a.createdAt||b.id.localeCompare(a.id):(order==='likes'?b.likeCount-a.likeCount:b.score-a.score)||b.createdAt-a.createdAt||b.id.localeCompare(a.id))
  const ids=[];let cursor,pages=0
  do{const page=await readOrderedFeed({order,gameId,cursor},options);assert.ok(page.items.length<=15);ids.push(...page.items.map(row=>row.id));cursor=page.next??undefined;if(++pages>4)throw Error('loop')}while(cursor)
  assert.deepEqual(ids,expected.map(row=>row.id),order+':'+gameId);assert.equal(new Set(ids).size,ids.length)
 }
})
test('snapshot mantém ordem enquanto contagem muda e moderação atual impede reexibição',async()=>{
 await seed();await buildRankingGeneration(options);const first=await readOrderedFeed({order:'likes'},options);assert.ok(first.next)
 const seen=new Set(first.items.map(r=>r.id));await store.transact(async tx=>{const row=await tx.get('shorts/s000');tx.set('shorts/s000',{...row,likeCount:999});tx.set('games/g2',{status:'banned',officialName:'g2'})})
 const second=await readOrderedFeed({order:'likes',cursor:first.next},options);assert.ok(second.items.every(row=>row.gameId==='g1'));assert.ok(second.items.every(row=>!seen.has(row.id)))
 const ranked=await readOrderedFeed({order:'relevant'},options);assert.ok(ranked.items.every(row=>row.gameId==='g1'));assert.equal(ranked.orderingAt,(await store.get('rankingState/current')).computedAt.toISOString())
})
test('coleta usa snapshot único para métricas e shorts, sem misturar atualização no meio',async()=>{
 await seed(31);let changed=false;const wrapped={...store,snapshotGet:async(path,point)=>{if(!changed&&path==='rankingMetrics/s030'){changed=true;await store.transact(async tx=>{const metric=await tx.get(path);tx.set(path,{...metric,likeMass:999})})}return store.snapshotGet(path,point)}}
 assert.equal((await buildRankingGeneration({...options,store:wrapped})).itemCount,31);assert.equal((await store.get('rankingMetrics/s030')).likeMass,999)
})
test('concorrência permite um único publicador e orçamento não passa do limite configurado',async()=>{
 await seed(2);const results=await Promise.allSettled([buildRankingGeneration(options),buildRankingGeneration(options)]);assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.status==='ready').length,1)
 const current=await store.get('rankingState/current');assert.ok(current);assert.equal((await buildRankingGeneration(options)).status,'not-due')
 const future=()=>new Date(Date.now()+2*3600000),day=future().toISOString().slice(0,10);await store.transact(async tx=>tx.set('rankingBudgets/'+day,{version:1,readsReserved:generationLimits.dailyReads,writesReserved:0,deletesReserved:0}));await assert.rejects(buildRankingGeneration({store,now:future}),/budget-exhausted/);assert.deepEqual(await store.get('rankingState/current'),current)
})
test('métricas, gerações, orçamento e cache são privados inclusive para alegação admin no SDK',async()=>{
 await seed(1);const result=await buildRankingGeneration(options),day=now().toISOString().slice(0,10)
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('owner',{admin:true}).firestore()])for(const path of ['rankingMetrics/s000','rankingState/current','rankingRuns/'+result.generationId,'rankingBudgets/'+day,'rankingItems/'+result.generationId+'_s000']){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{ready:true,score:999}))}
})
test('retenção REST protege atuais e apaga somente cache antigo em lotes de 30',async()=>{
 await seed(31);const generation=await buildRankingGeneration(options),future=()=>new Date(Date.now()+3*3600000)
 await assert.rejects(pruneRankingGeneration({store,now:future,generationId:generation.generationId}),/generation-protected/)
 await store.transact(async tx=>tx.set('rankingState/current',{generationId:'a'.repeat(32),previousGenerationId:'b'.repeat(32)}))
 assert.equal((await pruneRankingGeneration({store,now:future,generationId:generation.generationId})).deleted,30);assert.equal((await pruneRankingGeneration({store,now:future,generationId:generation.generationId})).deleted,2);assert.equal((await pruneRankingGeneration({store,now:future,generationId:generation.generationId})).complete,true);assert.equal(await store.get('rankingRuns/'+generation.generationId),null);assert.ok(await store.get('shorts/s000'))
})
test('nova publicação já nasce com contador zero; duplicatas e cota diária permanecem',async()=>{
 await seed(0);const visitor='f'.repeat(64),deps={...options,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})},input=n=>({url:'https://clips.twitch.tv/GenerationQuotaClip'+n,title:'Jogada da comunidade '+n,gameId:'g1'})
 for(let n=0;n<5;n++){const result=await submitShort(input(n),visitor,deps);assert.equal((await store.get('shorts/'+result.id)).likeCount,0)}
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video')
})
