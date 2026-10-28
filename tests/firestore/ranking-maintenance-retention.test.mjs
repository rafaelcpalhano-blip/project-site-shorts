import {claimRankingPilotStep} from '../../server/ranking/pilot.ts'
import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {readFile} from 'node:fs/promises'
import {doc,getDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {inspectRankingAdmission} from '../../server/ranking/continuous-maintenance.ts'
import {stepRankingGeneration} from '../../server/ranking/segmented-generation.ts'
import {maintainRankingRetention} from '../../server/ranking/maintenance-retention.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081,lazyTransactions:true}),now=()=>new Date('2026-10-28T12:03:00Z'),old='a'.repeat(32),current='f'.repeat(32),previous='e'.repeat(32);let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore()})
after(async()=>{await env?.cleanup()})
async function seed(count=9){await store.transact(async tx=>{tx.set('rankingState/current',{generationId:current,previousGenerationId:previous,publishedAt:now(),computedAt:now()});for(const id of [old,current,previous]){tx.set('rankingRuns/'+id,{version:1,status:'ready',startedAt:new Date(now()-3*3600000),publishedAt:new Date(now()-3*3600000)});for(let n=0;n<count;n++)tx.set('rankingItems/'+id+'_s'+n,{generationId:id})}tx.set('shorts/s',{title:'Protected original'});tx.set('comments/c',{content:'Protected comment'})})}
test('isolated emulator cleanup preserves active generations and primary data and stays private to SDK',async()=>{await seed();const pointer=await store.get('rankingState/current');const r=await maintainRankingRetention({store,now});assert.equal(r.deleted,10);assert.equal(await store.get('rankingRuns/'+old),null);assert.ok(await store.get('rankingRuns/'+current));assert.ok(await store.get('rankingRuns/'+previous));assert.deepEqual(await store.get('rankingState/current'),pointer);assert.equal((await store.get('shorts/s')).title,'Protected original');assert.equal((await store.get('comments/c')).content,'Protected comment');await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'maintenanceState/rankingRetention')))})
test('concurrent emulator invocations claim only one cleanup slice',async()=>{await seed();const r=await Promise.all([maintainRankingRetention({store,now}),maintainRankingRetention({store,now})]);assert.equal(r.filter(v=>v.status==='pruned').length,1);assert.equal(r.filter(v=>v.status==='already-checked').length,1);const b=await store.get('rankingBudgets/2026-10-28');assert.equal(b.readsReserved,110);assert.equal(b.deletesReserved,10)})
test('emulator cleanup resumes partial slice and exhausted budget never deletes',async()=>{await seed(20);const r=await maintainRankingRetention({store,now});assert.equal(r.complete,false);assert.equal(r.deleted,15);const later=()=>new Date(now().getTime()+15*60000);await store.transact(async tx=>tx.set('rankingBudgets/2026-10-28',{version:1,readsReserved:19999,writesReserved:0,deletesReserved:0}));await assert.rejects(maintainRankingRetention({store,now:later}),/ranking-budget-exhausted/);assert.ok(await store.get('rankingRuns/'+old));await store.transact(async tx=>tx.set('rankingBudgets/2026-10-28',{version:1,readsReserved:0,writesReserved:0,deletesReserved:0}));const final=await maintainRankingRetention({store,now:later});assert.equal(final.complete,true);assert.equal(final.deleted,6);assert.equal(await store.get('rankingRuns/'+old),null)})


test('emulator admission caps retained runs and resumes only after bounded recheck',async()=>{
 await seed();for(let n=1;n<=3;n++)await store.transact(async tx=>tx.set('rankingRuns/'+n.toString(16).padStart(32,'0'),{version:1,status:'ready',startedAt:new Date(now()-3*3600000),publishedAt:new Date(now()-3*3600000)}))
 assert.equal((await inspectRankingAdmission({store,now})).allowed,false);const budget=await store.get('rankingBudgets/2026-10-28')
 await store.transact(async tx=>tx.delete('rankingRuns/'+'1'.padStart(32,'0')))
 assert.equal((await inspectRankingAdmission({store,now})).allowed,false);assert.deepEqual(await store.get('rankingBudgets/2026-10-28'),budget)
 assert.equal((await inspectRankingAdmission({store,now:()=>new Date(now().getTime()+15*60000)})).allowed,true)
})
test('emulator pending admission cannot grant a concurrent generation check',async()=>{
 await seed();let release,entered;const wait=new Promise(r=>{release=r}),started=new Promise(r=>{entered=r})
 const guarded={...store,rankingRunsPage:async()=>{entered();await wait;return store.rankingRunsPage()}}
 const first=inspectRankingAdmission({store:guarded,now});await started
 assert.equal((await inspectRankingAdmission({store,now})).allowed,false);release();assert.equal((await first).allowed,true)
 assert.equal((await store.get('rankingBudgets/2026-10-28')).readsReserved,36)
})
test('emulator single-day guard abandons a crossed-day build without touching the old budget',async()=>{
 const late=()=>new Date('2026-10-28T23:59:00Z');await store.transact(async tx=>tx.set('rankingState/metrics',{version:1,ready:true,epoch:'a'.repeat(32)}))
 await stepRankingGeneration({store,now:late});const budget=await store.get('rankingBudgets/2026-10-28')
 await assert.rejects(stepRankingGeneration({store,now:()=>new Date('2026-10-29T00:00:00Z'),singleUtcDay:true}),/ranking-build-crossed-day/)
 assert.deepEqual(await store.get('rankingBudgets/2026-10-28'),budget);assert.equal((await store.get('rankingState/build')).phase,'failed');assert.equal(await store.get('rankingState/current'),null)
})


test('emulator pilot claims are durable, duplicate-safe and capped at eight',async()=>{
 const start=Date.parse('2026-10-28T12:00:00Z'),id='b'.repeat(32),configuration=JSON.stringify({id,startsAt:new Date(start).toISOString(),endsAt:new Date(start+20*60000).toISOString(),maximumSteps:8}),point=()=>new Date(start+15*60000)
 const claim=minute=>claimRankingPilotStep({store,now:point,input:{configuration,event:{cron:'* * * * *',scheduledTime:start+minute*60000}}})
 const first=await Promise.all([claim(0),claim(0)]);assert.equal(first.filter(r=>r.allowed).length,1)
 for(let n=1;n<8;n++)assert.equal((await claim(n)).allowed,true)
 assert.equal((await claim(8)).status,'step-limit');assert.equal((await store.get('maintenanceState/rankingPilot-'+id)).attempts,8)
})
test('emulator expired pilot cannot create its control record or authorize work',async()=>{
 const start=Date.parse('2026-10-28T12:00:00Z'),id='c'.repeat(32),configuration=JSON.stringify({id,startsAt:new Date(start).toISOString(),endsAt:new Date(start+20*60000).toISOString(),maximumSteps:8})
 const r=await claimRankingPilotStep({store,now:()=>new Date(start+20*60000),input:{configuration,event:{cron:'* * * * *',scheduledTime:start}}})
 assert.equal(r.allowed,false);assert.equal(await store.get('maintenanceState/rankingPilot-'+id),null)
})
