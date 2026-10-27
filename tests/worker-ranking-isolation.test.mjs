import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {runWorkerMaintenance} from '../server/runtime/worker-maintenance.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createOutboundBudget} from '../server/runtime/outbound-budget.ts'

function fixture(count=0){
 let time=Date.parse('2026-10-27T12:00:00Z')
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
