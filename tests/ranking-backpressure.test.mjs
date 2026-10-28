import test from 'node:test'
import assert from 'node:assert/strict'
import {stepRankingGeneration} from '../server/ranking/segmented-generation.ts'
import {inspectRankingAdmission,runBoundedRankingMaintenance,rankingBackpressureLimits} from '../server/ranking/continuous-maintenance.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
const day='2026-10-28'
function fixture(count){let point=Date.parse(day+'T12:03:00Z');const now=()=>new Date(point),docs=new Map();for(let n=0;n<count;n++)docs.set('rankingRuns/'+n.toString(16).padStart(32,'0'),{startedAt:new Date(point-3*3600000),publishedAt:new Date(point-3*3600000),status:'ready'});const f=restFixture(docs,now),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:f.fetcher,lazyTransactions:true});return {f,store,now,advance:ms=>{point+=ms}}}
test('admission counts all retained generations, allows below six, refuses six or larger and rejects malformed page',async()=>{assert.equal(rankingBackpressureLimits.maximumRetainedGenerations,6);for(const count of [0,5,6,30,31]){const d=fixture(count),r=await inspectRankingAdmission(d);assert.equal(r.allowed,count<6)}const d=fixture(0);d.store.rankingRunsPage=async()=>[{id:'not-valid',data:{}}];await assert.rejects(inspectRankingAdmission(d),/ranking-invalid-cleanup-page/);assert.equal(d.f.docs.get('maintenanceState/rankingAdmission').allowed,false)})
test('paused admission rechecks at fifteen minutes, preserves budget between checks and resumes once room is available',async()=>{const d=fixture(6);assert.equal((await inspectRankingAdmission(d)).allowed,false);const budget=structuredClone(d.f.docs.get('rankingBudgets/'+day));d.f.docs.delete('rankingRuns/'+'0'.repeat(32));d.advance(15*60000-1);assert.equal((await inspectRankingAdmission(d)).allowed,false);assert.deepEqual(d.f.docs.get('rankingBudgets/'+day),budget);d.advance(1);assert.equal((await inspectRankingAdmission(d)).allowed,true)})
test('failed or concurrent checks never grant admission from a pending result',async()=>{const d=fixture(5);let release;const wait=new Promise(r=>{release=r}),original=d.store.rankingRunsPage;d.store.rankingRunsPage=async()=>{await wait;return original()};const first=inspectRankingAdmission(d);for(let n=0;n<20&&!d.f.docs.has('maintenanceState/rankingAdmission');n++)await new Promise(r=>setTimeout(r,1));assert.equal((await inspectRankingAdmission(d)).allowed,false);release();assert.equal((await first).allowed,true);const e=fixture(0);e.store.rankingRunsPage=async()=>{throw Error('fixture-failure')};await assert.rejects(inspectRankingAdmission(e),/fixture-failure/);assert.equal((await inspectRankingAdmission(e)).allowed,false)})
test('exhausted and malformed budget or future admission state refuse before writes',async()=>{for(const budget of [{version:1,readsReserved:19999,writesReserved:0,deletesReserved:0},{version:1,readsReserved:0,writesReserved:3999,deletesReserved:0},{version:1,readsReserved:0}]){const d=fixture(0);d.f.docs.set('rankingBudgets/'+day,budget);const before=structuredClone([...d.f.docs]);await assert.rejects(inspectRankingAdmission(d),/ranking-(budget-exhausted|invalid-budget)/);assert.deepEqual([...d.f.docs],before)}const d=fixture(0);d.f.docs.set('maintenanceState/rankingAdmission',{version:1,nonce:'a'.repeat(32),allowed:true,checkedAt:new Date(d.now().getTime()+1)});await assert.rejects(inspectRankingAdmission(d),/ranking-invalid-admission/)})
test('overdue ranking still performs bounded retention when new generations are paused',async()=>{const d=fixture(6),current='5'.padStart(32,'0'),previous='4'.padStart(32,'0'),pointer={version:1,generationId:current,previousGenerationId:previous,computedAt:new Date(d.now()-3*3600000),publishedAt:new Date(d.now()-3*3600000)};d.f.docs.set('rankingState/current',pointer);d.f.docs.set('rankingItems/'+'0'.repeat(32)+'_s',{generationId:'0'.repeat(32)});d.f.docs.set('shorts/s',{title:'preserved'});const r=await runBoundedRankingMaintenance(d);assert.equal(r.task,'ranking-retention');assert.equal(r.rankingPaused,'retention-backlog');assert.equal(r.deleted,2);assert.deepEqual(d.f.docs.get('rankingState/current'),pointer);assert.equal(d.f.docs.get('shorts/s').title,'preserved');assert.equal(d.f.docs.has('rankingState/build'),false)})
test('malformed active checkpoint is not bypassed by admission',async()=>{const d=fixture(0);d.f.docs.set('rankingState/build',{phase:'scan'});await assert.rejects(runBoundedRankingMaintenance(d),/ranking-invalid-checkpoint/);assert.equal(d.f.docs.has('maintenanceState/rankingAdmission'),false)})


test('single-day mode refuses a new build at the UTC boundary without any mutation',async()=>{
 const d=fixture(0);d.advance(Date.parse(day+'T23:30:00Z')-d.now().getTime());const before=structuredClone([...d.f.docs])
 assert.equal((await stepRankingGeneration({...d,singleUtcDay:true})).status,'day-boundary');assert.deepEqual([...d.f.docs],before)
 const result=await runBoundedRankingMaintenance(d);assert.equal(result.rankingPaused,'utc-day-boundary');assert.equal(d.f.docs.has('rankingState/build'),false)
})
test('interrupted legacy build crossing UTC is abandoned without changing the old budget or public pointer',async()=>{
 const d=fixture(0);d.advance(Date.parse(day+'T23:59:00Z')-d.now().getTime());d.f.docs.set('rankingState/metrics',{version:1,ready:true,epoch:'a'.repeat(32)})
 assert.equal((await stepRankingGeneration(d)).status,'building');const budget=structuredClone(d.f.docs.get('rankingBudgets/'+day));d.advance(60000)
 await assert.rejects(stepRankingGeneration({...d,singleUtcDay:true}),/ranking-build-crossed-day/)
 assert.deepEqual(d.f.docs.get('rankingBudgets/'+day),budget);assert.equal(d.f.docs.get('rankingState/build').phase,'failed');assert.equal(d.f.docs.has('rankingState/current'),false)
})
test('finalization crossing UTC cannot publish or refund the previous day budget',async()=>{
 const d=fixture(0);d.advance(Date.parse(day+'T23:59:59Z')-d.now().getTime());d.f.docs.set('rankingState/metrics',{version:1,ready:true,epoch:'a'.repeat(32)})
 await stepRankingGeneration(d);await stepRankingGeneration(d);const budget=structuredClone(d.f.docs.get('rankingBudgets/'+day));let clocks=0
 const now=()=>{clocks++;return clocks===1?d.now():new Date(d.now().getTime()+1000)}
 await assert.rejects(stepRankingGeneration({store:d.store,now,singleUtcDay:true}),/ranking-build-crossed-day/)
 assert.deepEqual(d.f.docs.get('rankingBudgets/'+day),budget);assert.equal(d.f.docs.has('rankingState/current'),false)
})
