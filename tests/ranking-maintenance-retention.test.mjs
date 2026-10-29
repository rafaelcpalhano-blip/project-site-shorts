import test from 'node:test'
import assert from 'node:assert/strict'
import {maintainRankingRetention} from '../server/ranking/maintenance-retention.ts'
import {runWorkerMaintenance} from '../server/runtime/worker-maintenance.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createOutboundBudget} from '../server/runtime/outbound-budget.ts'
const current='f'.repeat(32),previous='e'.repeat(32),old='a'.repeat(32),day='2026-10-28'
function fixture(count=9){
 let time=Date.parse(day+'T12:03:00Z');const now=()=>new Date(time),docs=new Map(),start=new Date(time-3*3600000)
 docs.set('rankingState/current',{version:1,generationId:current,previousGenerationId:previous,publishedAt:now(),computedAt:now()})
 for(const id of [current,previous,old]){docs.set('rankingRuns/'+id,{version:1,status:'ready',startedAt:start,publishedAt:start});for(let n=0;n<count;n++)docs.set('rankingItems/'+id+'_s'+n,{generationId:id})}
 for(const path of ['games/g','shorts/s','comments/c','shortLikes/l','networkAbuse/n'])docs.set(path,{privateFixture:true})
 const f=restFixture(docs,now)
 const invocation=()=>{const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:f.fetcher}),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch,lazyTransactions:true});return {store,usage:()=>budget.usage().dispatched}}
 return {f,now,invocation,advance:ms=>{time+=ms},prune:async()=>{const v=invocation();return {...await maintainRankingRetention({store:v.store,now}),calls:v.usage()}}}
}
test('isolated ranking retention prunes an old generation while protecting current, previous and primary data',async()=>{const d=fixture(),before=structuredClone([...d.f.docs]),r=await d.prune();assert.equal(r.status,'pruned');assert.equal(r.complete,true);assert.equal(r.deleted,10);assert.ok(r.calls<48);assert.equal(d.f.docs.has('rankingRuns/'+old),false);for(const [p,v]of before)if(!p.startsWith('rankingItems/'+old)&&p!=='rankingRuns/'+old)assert.deepEqual(d.f.docs.get(p),v)})
test('quarter-hour gate makes no calls outside its slot and same-slot repeats cannot delete twice',async()=>{const d=fixture();d.advance(-60000);const before=d.f.calls();assert.equal((await d.prune()).status,'not-scheduled');assert.equal(d.f.calls(),before);d.advance(60000);await d.prune();const docs=structuredClone([...d.f.docs]);assert.equal((await d.prune()).status,'already-checked');assert.deepEqual([...d.f.docs],docs)})
test('partial cleanup resumes in the next slot and keeps all protected items',async()=>{const d=fixture(31);let total=0;for(let n=0;n<3;n++){const r=await d.prune();assert.equal(r.status,'pruned');assert.ok(r.calls<48);total+=r.deleted;d.advance(15*60000)}assert.equal(total,32);assert.equal(d.f.docs.has('rankingRuns/'+old),false);assert.equal([...d.f.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length,62)})
test('unexpired generations are skipped; a saved candidate that became current is protected again transactionally',async()=>{const d=fixture();const now=d.now();d.f.docs.set('rankingRuns/'+old,{version:1,status:'ready',startedAt:new Date(now-3600000),publishedAt:new Date(now-3600000)});assert.equal((await d.prune()).status,'idle');assert.equal(d.f.docs.has('rankingRuns/'+old),true);d.advance(15*60000);d.f.docs.set('maintenanceState/rankingRetention',{version:1,slot:Math.floor(d.now()/900000)-1,after:null,candidate:current});assert.equal((await d.prune()).status,'protected');assert.equal(d.f.docs.has('rankingRuns/'+current),true)})
test('exhausted or malformed discovery budget refuses any mutation',async()=>{for(const budget of [{version:1,readsReserved:19999,writesReserved:0,deletesReserved:0},{version:1,readsReserved:0,writesReserved:3999,deletesReserved:0},{version:1,readsReserved:0}]){const d=fixture();d.f.docs.set('rankingBudgets/'+day,budget);const before=structuredClone([...d.f.docs]);await assert.rejects(d.prune(),/ranking-(budget-exhausted|invalid-budget)/);assert.deepEqual([...d.f.docs],before)}})
test('concurrent same-slot invocations claim once and never double-delete or overcharge discovery',async()=>{const d=fixture();const results=await Promise.all([d.prune(),d.prune()]);assert.equal(results.filter(r=>r.status==='pruned').length,1);assert.equal(results.filter(r=>r.status==='already-checked').length,1);assert.equal(d.f.docs.get('rankingBudgets/'+day).readsReserved,110)})
test('invalid or future discovery cursor and malformed page fail closed',async()=>{for(const cursor of [{version:1,slot:Math.floor(Date.parse(day+'T12:03:00Z')/900000)+1,after:null,candidate:null},{version:1,slot:0,after:'invalid',candidate:null}]){const d=fixture();d.f.docs.set('maintenanceState/rankingRetention',cursor);await assert.rejects(d.prune(),/ranking-invalid-retention-cursor/);assert.equal(d.f.docs.has('rankingRuns/'+old),true)}const d=fixture(),v=d.invocation();v.store.rankingRunsPage=async()=>[{id:old,data:{}},{id:old,data:{}}];await assert.rejects(maintainRankingRetention({store:v.store,now:d.now}),/ranking-invalid-cleanup-page/);assert.equal(d.f.docs.has('rankingRuns/'+old),true)})
test('ranking with retention dispatches only bounded ranking cleanup when not due',async()=>{const d=fixture(),v=d.invocation(),primary=structuredClone([...d.f.docs].filter(([p])=>/^(games|shorts|comments|shortLikes|networkAbuse)\//.test(p)));const r=await runWorkerMaintenance({store:v.store,now:d.now,mode:'ranking-with-retention'});assert.equal(r.task,'ranking-retention');assert.equal(r.status,'pruned');assert.ok(v.usage()<48);for(const [p,value]of primary)assert.deepEqual(d.f.docs.get(p),value)})
test('cleanup can resume on a new UTC day without modifying the previous budget',async()=>{const d=fixture(31);await d.prune();const before=structuredClone(d.f.docs.get('rankingBudgets/'+day));d.advance(86400000);await d.prune();assert.deepEqual(d.f.docs.get('rankingBudgets/'+day),before);assert.ok(d.f.docs.has('rankingBudgets/2026-10-29'))})


for(const scenario of [{count:9,days:2},{count:100,days:3},{count:9,growTo:100,days:3}])test('bounded full-clock ranking '+JSON.stringify(scenario),async t=>{
 const {count,days,growTo}=scenario;let point=Date.parse('2026-10-28T00:00:00Z');const start=point,now=()=>new Date(point),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 const add=(map,from,to)=>{for(let n=from;n<to;n++){const id='s'+String(n).padStart(3,'0'),gameId='g'+n;map.set('games/'+gameId,{officialName:'Game '+n,status:'active',createdAt:new Date(start-3*86400000)});map.set('shorts/'+id,{gameId,moderationStatus:'published',createdAt:new Date(start-86400000),likeCount:2});map.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(start-3600000)})}}
 add(docs,0,count)
 const f=restFixture(docs,now),primary=structuredClone([...f.docs]);let ready=0,deleted=0,blocked=0,paused=0,maxCalls=0,maximumItems=0,maximumRuns=0
 const readsByDay=new Map(),writeAttemptsByDay=new Map()
 const measuredFetch=async(input,init)=>{const operation=String(input).split(':').at(-1),body=JSON.parse(init.body),day=now().toISOString().slice(0,10),response=await f.fetcher(input,init);let reads=0
  if(operation==='batchGet')reads=body.documents.length
  if(operation==='runQuery'){const rows=await response.clone().json();reads=Math.max(1,rows.filter(r=>r.document).length)}
  readsByDay.set(day,(readsByDay.get(day)??0)+reads)
  if(operation==='commit')writeAttemptsByDay.set(day,(writeAttemptsByDay.get(day)??0)+(body.writes?.length??0))
  return response
 }
 for(let minute=0;minute<days*1440;minute++){
  point=start+minute*60000
  if(growTo&&minute===1440){add(f.docs,count,growTo);primary.splice(0,primary.length,...structuredClone([...f.docs].filter(([p])=>/^(games|shorts|rankingMetrics)\//.test(p))))}
  const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:measuredFetch}),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch,lazyTransactions:true})
  const pointer=structuredClone(f.docs.get('rankingState/current'))
  try{const result=await runWorkerMaintenance({store,now,mode:'ranking-with-retention'});if(result.task==='ranking'&&result.status==='ready')ready++;if(result.task==='ranking-retention')deleted+=result.deleted??0;if(result.rankingPaused)paused++}
  catch(error){assert.equal(error.message,'ranking-budget-exhausted');assert.deepEqual(f.docs.get('rankingState/current'),pointer);blocked++}
  maxCalls=Math.max(maxCalls,budget.usage().dispatched);assert.ok(budget.usage().dispatched<48)
  maximumItems=Math.max(maximumItems,[...f.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length)
  maximumRuns=Math.max(maximumRuns,[...f.docs.keys()].filter(p=>p.startsWith('rankingRuns/')).length);assert.ok(maximumRuns<=6)
  for(const [path,value]of primary)assert.deepEqual(f.docs.get(path),value)
  for(const [path,value]of f.docs)if(path.startsWith('rankingBudgets/')){assert.ok(value.readsReserved<=20000);assert.ok(value.writesReserved<=4000);assert.ok(value.deletesReserved<=4000)}
  for(const [path,value]of f.docs)if(path.startsWith('rankingBudgets/'))assert.equal(value.updatedAt.toISOString().slice(0,10),path.split('/')[1])
 }
 const retained=[...f.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length
 assert.ok(ready>0);assert.ok(deleted>0);assert.equal(blocked,0)
 assert.ok(maximumItems<=6*(growTo??count))
 if(count===9&&!growTo){assert.ok(ready>=60);assert.ok(ready<=64);assert.ok(retained<ready*count/3)}else assert.ok(paused>0)
 assert.equal(readsByDay.size,days)
 for(const reads of readsByDay.values())assert.ok(reads<50000)
 t.diagnostic(JSON.stringify({sources:count,growTo,days,ready,deleted,blocked,paused,maxCalls,maximumRuns,maximumItems,retainedItems:retained,documentReadRequestsByDay:Object.fromEntries(readsByDay),writeAndDeleteAttemptsByDay:Object.fromEntries(writeAttemptsByDay),budgets:[...f.docs].filter(([p])=>p.startsWith('rankingBudgets/')).map(([path,data])=>({path,...data}))}))
})
