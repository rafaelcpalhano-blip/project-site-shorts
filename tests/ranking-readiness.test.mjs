import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectRankingReadiness} from '../server/ranking/readiness.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'

function fixture(count=1){
 const now=()=>new Date('2026-10-27T08:00:00Z'),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 docs.set('games/game',{status:'active',createdAt:new Date(now()-3*86400000)})
 for(let n=0;n<count;n++){
  const id='s'+String(n).padStart(3,'0')
  docs.set('shorts/'+id,{gameId:'game',moderationStatus:'published',likeCount:2,createdAt:new Date(now()-86400000)})
  docs.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId:'game',likeMass:1,commentMass:0,commentContributors:0,asOf:new Date(now()-3600000)})
 }
 const rest=restFixture(docs,now)
 const fetcher=async(url,init)=>{assert.ok(!/:commit$|:beginTransaction$/.test(String(url)));return rest.fetcher(url,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher})
 store.transact=()=>{throw Error('inspection-must-not-open-write-transaction')}
 return {store,now,rest,epoch}
}

for(const [count,steps] of [[0,3],[1,4],[30,7],[31,7],[100,14]])test('readiness validates '+count+' real REST fixture sources and estimates '+steps+' steps without writes',async()=>{
 const d=fixture(count),before=structuredClone([...d.rest.docs])
 const result=await inspectRankingReadiness(d)
 assert.equal(result.status,'ready');assert.equal(result.sourceDocuments,count);assert.equal(result.eligibleVideos,count);assert.equal(result.estimatedBuildSteps,steps)
 assert.equal(result.writes,0);assert.deepEqual([...d.rest.docs],before)
})

test('readiness blocks unprepared metrics, active work/lease and exhausted budget before scanning sources',async()=>{
 for(const [patch,reason] of [
  [d=>d.rest.docs.delete('rankingState/metrics'),'ranking-metrics-not-ready'],
  [d=>d.rest.docs.set('rankingState/build',{phase:'scan'}),'ranking-build-busy'],
  [d=>d.rest.docs.set('rankingState/lease',{expiresAt:new Date(d.now().getTime()+60000)}),'ranking-build-busy'],
  [d=>d.rest.docs.set('rankingBudgets/2026-10-27',{version:1,readsReserved:20000,writesReserved:0,deletesReserved:0}),'ranking-budget-exhausted'],
 ]){
  const d=fixture();patch(d);const before=structuredClone([...d.rest.docs]),r=await inspectRankingReadiness(d)
  assert.equal(r.status,'blocked');assert.equal(r.reason,reason);assert.equal(r.sourcePages,0);assert.deepEqual([...d.rest.docs],before)
 }
})

test('readiness refuses incomplete legacy/metrics and excludes inactive games without repairing documents',async()=>{
 for(const [patch,reason] of [
  [d=>delete d.rest.docs.get('shorts/s000').likeCount,'ranking-preparation-required'],
  [d=>d.rest.docs.delete('rankingMetrics/s000'),'ranking-metrics-not-ready'],
  [d=>d.rest.docs.get('rankingMetrics/s000').likeMass=999,'ranking-invalid-metrics'],
 ]){
  const d=fixture();patch(d);const before=structuredClone([...d.rest.docs]),r=await inspectRankingReadiness(d)
  assert.equal(r.status,'blocked');assert.equal(r.reason,reason);assert.deepEqual([...d.rest.docs],before)
 }
 const hidden=fixture();hidden.rest.docs.get('games/game').status='hidden';hidden.rest.docs.delete('rankingMetrics/s000')
 const r=await inspectRankingReadiness(hidden);assert.equal(r.status,'ready');assert.equal(r.eligibleVideos,0);assert.equal(r.inactiveGameSkipped,1)
})

test('readiness uses one source snapshot and detects a live metric epoch change before returning ready',async()=>{
 const stable=fixture(31),scan=stable.store.rankingSourcePage;let pages=0
 stable.store.rankingSourcePage=async(...args)=>{const p=await scan(...args);if(++pages===1)stable.rest.docs.get('rankingMetrics/s030').likeMass=999;return p}
 assert.equal((await inspectRankingReadiness(stable)).status,'ready')
 const changed=fixture(),original=changed.store.rankingSourcePage
 changed.store.rankingSourcePage=async(...args)=>{const p=await original(...args);changed.rest.docs.get('rankingState/metrics').epoch='b'.repeat(32);return p}
 const r=await inspectRankingReadiness(changed);assert.equal(r.status,'blocked');assert.equal(r.reason,'ranking-metrics-changed')
})

test('readiness never reports a truncated pilot or more than the generation capacity as ready',async()=>{
 const pilot=await inspectRankingReadiness({...fixture(31),maximumSources:30})
 assert.equal(pilot.status,'blocked');assert.equal(pilot.reason,'ranking-source-limit')
 const tooMany=await inspectRankingReadiness(fixture(101));assert.equal(tooMany.status,'blocked');assert.equal(tooMany.reason,'ranking-video-limit')
 const worst=fixture(300);for(let n=100;n<300;n++)worst.rest.docs.get('shorts/s'+String(n).padStart(3,'0')).moderationStatus='removed'
 const r=await inspectRankingReadiness(worst);assert.equal(r.status,'ready');assert.equal(r.estimatedBuildSteps,28);assert.equal(r.eligibleVideos,100)
})

test('readiness keeps a fresh ranking untouched and does not leak arbitrary read error messages',async()=>{
 const d=fixture();d.rest.docs.set('rankingState/current',{version:1,generationId:'b'.repeat(32),metricsEpoch:d.epoch,computedAt:d.now()})
 const before=structuredClone([...d.rest.docs]),r=await inspectRankingReadiness(d)
 assert.equal(r.status,'not-due');assert.equal(r.sourcePages,0);assert.deepEqual([...d.rest.docs],before)
 d.store.get=async()=>{throw Error('private transport credentials')}
 const unavailable=await inspectRankingReadiness(d)
 assert.equal(unavailable.reason,'ranking-inspection-unavailable');assert.ok(!JSON.stringify(unavailable).includes('credentials'))
})
