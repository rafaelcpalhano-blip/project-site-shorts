import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {runWorkerMaintenance} from '../server/runtime/worker-maintenance.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createOutboundBudget} from '../server/runtime/outbound-budget.ts'
import {generationLimits} from '../server/ranking/generation.ts'
import {pruneRankingGeneration} from '../server/ranking/retention.ts'

function fixture(count=0,initialTime='2026-10-27T12:00:00Z'){
 let time=Date.parse(initialTime)
 const now=()=>new Date(time),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 for(let n=0;n<count;n++){
  const id='s'+String(n).padStart(3,'0'),gameId='g'+n
  docs.set('games/'+gameId,{officialName:'Game '+n,status:'active',createdAt:new Date(time-3*86400000)})
  docs.set('shorts/'+id,{gameId,moderationStatus:'published',createdAt:new Date(time-86400000),likeCount:2})
  docs.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(time-3600000)})
 }
 const f=restFixture(docs,now)
 return {f,now,advance:ms=>{time+=ms},step:async()=>{
  const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:f.fetcher})
  const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch,lazyTransactions:true})
  const result=await runWorkerMaintenance({store,now,mode:'ranking-only'})
  return {...result,calls:budget.usage().dispatched}
 }}
}

test('ranking-only not-due ticks never dispatch retention in any minute slot',async()=>{
 const d=fixture();d.f.docs.set('rankingState/current',{generationId:'b'.repeat(32),computedAt:d.now(),publishedAt:d.now()})
 for(const collection of ['networkAbuse','shortLikes','likeAttempts','rankingRuns','rankingItems'])d.f.docs.set(collection+'/fixture',{privateFixture:true})
 const before=structuredClone([...d.f.docs])
 for(let minute=0;minute<4;minute++){const r=await d.step();assert.equal(r.task,'ranking');assert.equal(r.status,'not-due');d.advance(60000)}
 assert.deepEqual([...d.f.docs],before)
})

for(const count of [0,1,31,100])test('ranking-only REST lifecycle '+count+' sources promotes complete generation without editing primary records',async()=>{
 const d=fixture(count),primary=structuredClone([...d.f.docs]);let result,steps=0
 do{result=await d.step();assert.equal(result.task,'ranking');assert.ok(result.calls<48);steps++;assert.ok(steps<=25);if(result.status!=='ready')assert.equal(d.f.docs.has('rankingState/current'),false);d.advance(60000)}while(result.status!=='ready')
 assert.equal(result.itemCount,count)
 assert.equal([...d.f.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length,count)
 for(const [p,data] of primary)assert.deepEqual(d.f.docs.get(p),data)
 assert.ok([...d.f.docs.keys()].every(p=>primary.some(([key])=>key===p)||/^(rankingState|rankingBudgets|rankingRuns|rankingItems)\//.test(p)))
 assert.equal((await d.step()).status,'not-due')
})

test('ranking-only invalid source refuses promotion and leaves primary data and previous pointer intact',async()=>{
 const d=fixture(1),previous={generationId:'f'.repeat(32),computedAt:new Date(d.now()-7200000),publishedAt:new Date(d.now()-7200000)}
 d.f.docs.set('rankingState/current',previous);d.f.docs.delete('rankingMetrics/s000')
 const short=structuredClone(d.f.docs.get('shorts/s000'))
 await d.step();await assert.rejects(d.step(),/ranking-metrics-not-ready/)
 assert.deepEqual(d.f.docs.get('rankingState/current'),previous);assert.deepEqual(d.f.docs.get('shorts/s000'),short)
})

function loadMain(){
 const modes=[],source=readFileSync(new URL('../server/runtime/cloudflare-main.ts',import.meta.url),'utf8'),exports={}
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 vm.runInNewContext(compiled,{exports,require:name=>name.includes('cloudflare-application')?{createCloudflareApplication:()=>Object.assign(async()=>Response.json({}),{maintenance:async mode=>{modes.push(mode);return {task:'fixture',status:'not-due'}}})}:name.includes('worker-api-headers')?{workerApiHeaders:()=>({})}:{},URL,Request,Response,WeakMap,Set,crypto,console:{info(){},warn(){}}})
 return {entry:exports.default,modes}
}
test('scheduled entry uses strict opt-in flags, ranking-only mode and preserves explicit legacy all-jobs mode',async()=>{
 const {entry,modes}=loadMain(),env={CLIPZONE_ADMIN_UIDS:'fixture'}
 for(const value of [undefined,'false','TRUE','1','yes']){env.CLIPZONE_RANKING_ENABLED=value;assert.equal((await entry.scheduled({},env)).status,'disabled')}
 assert.equal(modes.length,0)
 env.CLIPZONE_RANKING_ENABLED='true';await entry.scheduled({},env);assert.deepEqual(modes,['ranking-only'])
 env.CLIPZONE_JOBS_ENABLED='true';await entry.scheduled({},env);assert.deepEqual(modes,['ranking-only',undefined])
 env.CLIPZONE_JOBS_ENABLED='false';env.CLIPZONE_RANKING_ENABLED='false';await entry.scheduled({},env);assert.equal(modes.length,2)
})

// Accelerated local day: all Firestore/OAuth traffic stays in the REST fixture.
for(const count of [9,100])test('30-minute ranking day '+count+' sources preserves primary data and stops atomically at budget',async t=>{
 const d=fixture(count,'2026-10-27T00:00:00Z'),primary=structuredClone([...d.f.docs])
 const start=d.now().getTime(),day=d.now().toISOString().slice(0,10)
 let completed=0,blocked=false,maxCalls=0
 for(let cycle=0;cycle<48;cycle++){
  // Follow the actual snapshot timestamp, not an assumed wall-clock schedule.
  const prior=d.f.docs.get('rankingState/current')
  const due=prior?prior.computedAt.getTime()+generationLimits.intervalMs:start
  if(due>=start+86400000)break
  d.advance(due-d.now().getTime())
  const before=structuredClone([...d.f.docs]),pointer=structuredClone(d.f.docs.get('rankingState/current'))
  let result
  try{
   for(let step=0;step<29;step++){
    result=await d.step();maxCalls=Math.max(maxCalls,result.calls)
    if(result.status==='ready')break
    assert.equal(result.status,'building');d.advance(60000)
   }
  }catch(error){
   assert.match(error.message,/^ranking-budget-exhausted$/)
   assert.deepEqual([...d.f.docs],before)
   assert.deepEqual(d.f.docs.get('rankingState/current'),pointer)
   blocked=true;break
  }
  assert.equal(result.status,'ready');assert.equal(result.itemCount,count);completed++
 }
 const budget=d.f.docs.get('rankingBudgets/'+day)
 assert.ok(budget.readsReserved<=generationLimits.dailyReads)
 assert.ok(budget.writesReserved<=generationLimits.dailyWrites)
 assert.ok(maxCalls<48)
 for(const [path,data] of primary)assert.deepEqual(d.f.docs.get(path),data)
 assert.equal([...d.f.docs.keys()].filter(path=>path.startsWith('rankingItems/')).length,completed*count)
 if(count===9){assert.ok(completed>=46&&completed<=48);assert.equal(blocked,false)}
 else{
  assert.ok(completed>0&&completed<48);assert.equal(blocked,true)
  const oldBudget=structuredClone(budget),pointer=structuredClone(d.f.docs.get('rankingState/current'))
  d.advance(start+86400000-d.now().getTime())
  assert.equal((await d.step()).status,'building')
  assert.deepEqual(d.f.docs.get('rankingState/current'),pointer)
  assert.deepEqual(d.f.docs.get('rankingBudgets/'+day),oldBudget)
  assert.ok(d.f.docs.has('rankingBudgets/'+d.now().toISOString().slice(0,10)))
 }
 t.diagnostic(JSON.stringify({sources:count,completed,blocked,maxCalls,readsReserved:budget.readsReserved,writesReserved:budget.writesReserved,retainedItems:completed*count}))
})

test('ranking retention after repeated generation preserves current, previous and primary records',async()=>{
 const d=fixture(9),primary=structuredClone([...d.f.docs]),generations=[]
 for(let cycle=0;cycle<6;cycle++){
  let result
  do{result=await d.step();if(result.status!=='ready')d.advance(60000)}while(result.status!=='ready')
  generations.push(result.generationId);d.advance(30*60000)
 }
 d.advance(2*3600000)
 const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:d.f.fetcher})
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch,lazyTransactions:true})
 const pointer=structuredClone(d.f.docs.get('rankingState/current'))
 for(const id of generations.slice(-2))await assert.rejects(pruneRankingGeneration({store,now:d.now,generationId:id,maximumRecords:15}),/ranking-generation-protected/)
 // A fresh invocation has its own outbound budget; never share a request budget.
 const cleanBudget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:d.f.fetcher})
 const cleanStore=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:cleanBudget.fetch,cleanupFetcher:cleanBudget.cleanupFetch,lazyTransactions:true})
 const result=await pruneRankingGeneration({store:cleanStore,now:d.now,generationId:generations[0],maximumRecords:15})
 assert.equal(result.complete,true);assert.equal(result.deleted,10);assert.ok(cleanBudget.usage().dispatched<48)
 assert.equal(d.f.docs.has('rankingRuns/'+generations[0]),false)
 assert.equal([...d.f.docs.values()].some(data=>data.generationId===generations[0]),false)
 assert.deepEqual(d.f.docs.get('rankingState/current'),pointer)
 for(const [path,data] of primary)assert.deepEqual(d.f.docs.get(path),data)
})


test('ranking retention requires both ranking opt-in and exact retention flag; all-jobs precedence remains explicit',async()=>{
 const {entry,modes}=loadMain(),env={CLIPZONE_ADMIN_UIDS:'fixture',CLIPZONE_RANKING_RETENTION_ENABLED:'true'}
 assert.equal((await entry.scheduled({},env)).status,'disabled');assert.equal(modes.length,0)
 env.CLIPZONE_RANKING_ENABLED='true'
 for(const value of [undefined,'false','TRUE','1']){env.CLIPZONE_RANKING_RETENTION_ENABLED=value;await entry.scheduled({},env);assert.equal(modes.at(-1),'ranking-only')}
 env.CLIPZONE_RANKING_RETENTION_ENABLED='true';await entry.scheduled({},env);assert.equal(modes.at(-1),'ranking-with-retention')
 env.CLIPZONE_JOBS_ENABLED='true';await entry.scheduled({},env);assert.equal(modes.at(-1),undefined)
})


test('pilot binding alone never enables scheduled maintenance or legacy all-jobs',async()=>{
 const {entry,modes}=loadMain(),env={CLIPZONE_ADMIN_UIDS:'fixture',CLIPZONE_RANKING_PILOT:'fixture'}
 assert.equal((await entry.scheduled({},env)).status,'disabled');env.CLIPZONE_RANKING_ENABLED='true';assert.equal((await entry.scheduled({},env)).status,'disabled');assert.equal(modes.length,0)
 env.CLIPZONE_RANKING_RETENTION_ENABLED='true';await entry.scheduled({},env);assert.deepEqual(modes,['ranking-with-retention']);env.CLIPZONE_JOBS_ENABLED='true';assert.equal((await entry.scheduled({},env)).status,'disabled');assert.equal(modes.length,1)
})
