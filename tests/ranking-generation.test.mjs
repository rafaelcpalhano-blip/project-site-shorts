import test from 'node:test'
import assert from 'node:assert/strict'
import {rankingScore} from '../server/ranking/metrics.ts'
import {buildRankingGeneration,generationLimits} from '../server/ranking/generation.ts'
import {prepareRanking} from '../server/ranking/prepare.ts'
import {pruneRankingGeneration} from '../server/ranking/retention.ts'
import {readOrderedFeed} from '../server/ranking/read-feed.ts'
function memory(count=1){
 let clock=new Date('2026-10-21T12:00:00Z'),tail=Promise.resolve(),points=0;const docs=new Map(),snapshots=new Map(),stats={writes:0,pages:0},fault={stage:false},now=()=>new Date(clock)
 for(let i=0;i<count;i++){const id='s'+String(i).padStart(3,'0');docs.set('shorts/'+id,{title:'Jogada '+i,platform:'Twitch',platformVideoId:'RankingClip'+i,normalizedUrl:'https://clips.twitch.tv/RankingClip'+i,gameId:'game',createdAt:new Date(clock-86400000),moderationStatus:'published',likeCount:2});docs.set('rankingMetrics/'+id,{version:1,ready:true,shortId:id,gameId:'game',likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(clock-3600000)})}
 docs.set('games/game',{officialName:'Jogo',createdAt:new Date(clock-300*3600000),status:'active'})
 const store={get:async path=>structuredClone(docs.get(path)??null),snapshotGet:async(path,point)=>structuredClone(snapshots.get(point)?.get(path)??null),rankingSourcePage:async(after,point)=>{
  stats.pages++;point??=now().toISOString().replace('Z',String(++points).padStart(3,'0')+'Z');if(!snapshots.has(point))snapshots.set(point,structuredClone(docs));return {readTime:point,items:[...snapshots.get(point)].filter(([p])=>p.startsWith('shorts/')&&(!after||p.slice(7)>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([p,data])=>({id:p.slice(7),data:structuredClone(data)}))}
 },rankingItemsPage:async gen=>[...docs].filter(([p,d])=>p.startsWith('rankingItems/')&&d.generationId===gen).slice(0,30).map(([p,data])=>({id:p.split('/')[1],data:structuredClone(data)})),transact(work){const result=tail.then(async()=>{const writes=new Map(),deletes=new Set();const value=await work({get:async p=>{assert.equal(writes.size+deletes.size,0);return structuredClone(docs.get(p)??null)},set:(p,d)=>writes.set(p,d),create:(p,d)=>{if(fault.stage&&p.startsWith('rankingItems/'))throw Error('injected-failure');assert.ok(!docs.has(p));writes.set(p,d)},delete:p=>deletes.add(p)});for(const [p,d]of writes){docs.set(p,d);stats.writes++}for(const p of deletes)docs.delete(p);return value});tail=result.catch(()=>{});return result}}
 return {store,docs,stats,now,fault,clock:date=>{clock=date}}
}
const current=d=>structuredClone(d.docs.get('rankingState/current'))
test('métricas prontas usam 24/12/6 sem substituir totais históricos por atividade recente',()=>{
 const deps=memory(),short=deps.docs.get('shorts/s000'),game=deps.docs.get('games/game'),metric=deps.docs.get('rankingMetrics/s000')
 assert.ok(Math.abs(rankingScore(short,game,metric,'s000',deps.now())-(1+1.25*2**(-1/12)))<1e-10)
 for(const invalid of [null,{...metric,ready:false},{...metric,likeMass:-1},{...metric,asOf:new Date(deps.now().getTime()+1000)},{...metric,shortId:'other'}])assert.throws(()=>rankingScore(short,game,invalid,'s000',deps.now()))
})
test('preparação preenche somente ausentes, mantém contadores existentes e não inventa métricas',async()=>{
 const deps=memory(2);deps.docs.get('shorts/s000').likeCount=5;delete deps.docs.get('shorts/s001').likeCount;deps.docs.delete('rankingMetrics/s001')
 const inspect=await prepareRanking(deps);assert.equal(inspect.missingCounts,1);assert.equal(deps.stats.writes,0)
 const result=await prepareRanking({...deps,apply:true});assert.equal(result.changed,1);assert.equal(deps.docs.get('shorts/s000').likeCount,5);assert.equal(deps.docs.get('shorts/s001').likeCount,0);assert.equal(deps.docs.get('rankingMetrics/s001').ready,false);assert.equal((await prepareRanking({...deps,apply:true})).changed,0)
})
test('preparação não aplica prefixo incompleto quando ultrapassa limite ou encontra contador inválido',async()=>{
 const deps=memory(2);delete deps.docs.get('shorts/s000').likeCount;await assert.rejects(prepareRanking({...deps,apply:true,maximum:1}),/preparation-limit/);assert.equal(deps.stats.writes,0)
 deps.docs.get('shorts/s001').likeCount=-1;await assert.rejects(prepareRanking({...deps,apply:true}),/invalid-like-count/);assert.equal(deps.stats.writes,0)
})
test('geração só promove depois de completa, mantém metadados e não publica novamente antes do intervalo configurado',async()=>{
 const deps=memory(37),before=structuredClone(deps.docs.get('shorts/s000')),result=await buildRankingGeneration(deps)
 assert.equal(result.status,'ready');assert.equal(result.itemCount,15);assert.equal(current(deps).generationId,result.generationId);assert.equal(deps.docs.get('rankingRuns/'+result.generationId).status,'ready');assert.deepEqual(deps.docs.get('shorts/s000'),before)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length,15);assert.equal((await buildRankingGeneration(deps)).status,'not-due')
})
test('métricas ausentes/limites deixam geração anterior intacta e nunca publicam ranking truncado',async()=>{
 for(const [count,removeMetric,pattern]of [[1,true,/metrics-not-ready/],[101,false,/video-limit/]]){
  const deps=memory(count);deps.docs.set('rankingState/current',{generationId:'f'.repeat(32),publishedAt:new Date(deps.now()-7200000),computedAt:new Date(deps.now()-7200000)});const before=current(deps)
  if(removeMetric)deps.docs.delete('rankingMetrics/s000')
  await assert.rejects(buildRankingGeneration(deps),pattern);assert.deepEqual(current(deps),before);assert.equal([...deps.docs.values()].some(d=>d.status==='failed'),true)
 }
})
test('orçamento esgotado ou lease ativo não grava nem derruba geração corrente',async()=>{
 const deps=memory(),day=deps.now().toISOString().slice(0,10);deps.docs.set('rankingBudgets/'+day,{version:1,readsReserved:generationLimits.dailyReads,writesReserved:0,deletesReserved:0});await assert.rejects(buildRankingGeneration(deps),/budget-exhausted/);assert.equal(deps.stats.writes,0)
 deps.docs.delete('rankingBudgets/'+day);deps.docs.set('rankingState/lease',{id:'other',expiresAt:new Date(deps.now().getTime()+10000)});await assert.rejects(buildRankingGeneration(deps),/build-busy/);assert.equal(deps.stats.writes,0)
})
test('concorrência permite um construtor; falha de staging preserva ponteiro e admite nova tentativa',async()=>{
 const deps=memory(2),results=await Promise.allSettled([buildRankingGeneration(deps),buildRankingGeneration(deps)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/build-busy/)
 const broken=memory();broken.fault.stage=true;await assert.rejects(buildRankingGeneration(broken),/injected-failure/);assert.equal(current(broken),undefined);broken.fault.stage=false;assert.equal((await buildRankingGeneration(broken)).status,'ready')
})
test('leitura usa um snapshot de fontes mesmo que fonte atual mude durante coleta',async()=>{
 const deps=memory(31),scan=deps.store.rankingSourcePage;let calls=0
 deps.store.rankingSourcePage=async(...args)=>{const result=await scan(...args);if(++calls===1)deps.docs.get('rankingMetrics/s030').likeMass=999;return result}
 const result=await buildRankingGeneration(deps);assert.equal(result.itemCount,15);assert.equal(result.examined,31)
})
test('limpeza recusa geração corrente/anterior, remove somente cache antigo em lotes',async()=>{
 const deps=memory(31),result=await buildRankingGeneration(deps);for(let n=0;[...deps.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length<31;n++)deps.docs.set('rankingItems/'+result.generationId+'_legacy'+n,{generationId:result.generationId});deps.clock(new Date(deps.now().getTime()+3*3600000));await assert.rejects(pruneRankingGeneration({...deps,generationId:result.generationId}),/generation-protected/)
 deps.docs.set('rankingState/current',{generationId:'c'.repeat(32),previousGenerationId:'d'.repeat(32)})
 assert.equal((await pruneRankingGeneration({...deps,generationId:result.generationId})).deleted,30);assert.equal((await pruneRankingGeneration({...deps,generationId:result.generationId})).deleted,2);assert.equal((await pruneRankingGeneration({...deps,generationId:result.generationId})).complete,true);assert.equal(deps.docs.has('shorts/s000'),true)
})
test('cursor expirado/mudança de modo e ranking ausente não consultam fontes',async()=>{
 const deps=memory();deps.store.rankingPage=async()=>{throw Error('must-not-query')}
 await assert.rejects(readOrderedFeed({order:'relevant'},deps),/not-ready-or-stale/)
 const cursor={scope:'likes:*',readTime:new Date(deps.now()-31*60000).toISOString(),id:'s000',time:deps.now().toISOString(),value:2}
 await assert.rejects(readOrderedFeed({order:'likes',cursor},deps),/cursor-expired-or-mismatched/);await assert.rejects(readOrderedFeed({order:'oldest',cursor:{...cursor,readTime:deps.now().toISOString()}},deps),/cursor-expired-or-mismatched/)
})

test('cache órfão não é anunciado como limpeza concluída nem excluído sem histórico',async()=>{
 const deps=memory(),generationId='e'.repeat(32);deps.docs.set('rankingItems/'+generationId+'_s000',{generationId,shortId:'s000'})
 await assert.rejects(pruneRankingGeneration({...deps,generationId}),/run-missing/);assert.ok(deps.docs.has('rankingItems/'+generationId+'_s000'))
})
