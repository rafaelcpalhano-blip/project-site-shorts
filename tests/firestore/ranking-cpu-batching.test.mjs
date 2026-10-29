import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {readFile} from 'node:fs/promises'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {stepRankingGeneration,stepRankingGenerationFromCheckpoint,segmentedRankingLimits} from '../../server/ranking/segmented-generation.ts'
import {abandonExpiredRankingBuild} from '../../server/ranking/recovery.ts'
import {runControlledRanking} from '../../server/ranking/controlled-generation.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081,lazyTransactions:true}),epoch='a'.repeat(32);let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore()});after(async()=>{await env?.cleanup()})
async function seed(){const time=Date.now();await store.transact(async tx=>{tx.set('rankingState/metrics',{version:1,ready:true,epoch});tx.set('games/g',{status:'active',createdAt:new Date(time-3*86400000),description:'unneeded'.repeat(1000),translation:{text:'unneeded'.repeat(1000)}});for(let n=0;n<10;n++){tx.set('shorts/s'+n,{gameId:'g',moderationStatus:'published',likeCount:2,createdAt:new Date(time-86400000)});tx.set('rankingMetrics/s'+n,{version:1,ready:true,epoch,shortId:'s'+n,gameId:'g',likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(time-3600000)})}})}
test('emulator snapshot batch projects game fields and reads historical state after live changes',async()=>{await seed();const page=await store.rankingSourcePage();await store.transact(async tx=>{const g=await tx.get('games/g');tx.set('games/g',{...g,status:'hidden'})});const [g,m,missing]=await store.rankingSnapshotGetMany(['games/g','rankingMetrics/s0','games/missing'],page.readTime);assert.equal(g.status,'active');assert.equal(g.description,undefined);assert.equal(g.translation,undefined);assert.ok(g.createdAt instanceof Date);assert.equal(m.epoch,epoch);assert.equal(missing,null);assert.equal((await store.get('games/g')).status,'hidden')})
test('emulator optimized generation publishes complete output and stale pre-read checkpoint cannot overwrite progress',async()=>{await seed();const options={store,now:()=>new Date()};const first=await stepRankingGenerationFromCheckpoint(options,null);const stale=await store.get('rankingState/build');await stepRankingGeneration(options);assert.equal((await stepRankingGenerationFromCheckpoint(options,stale)).status,'busy');assert.equal(await store.get('rankingState/current'),null);let result;for(let n=0;n<4;n++){result=await stepRankingGeneration(options);if(result.status==='ready')break}assert.equal(result.status,'ready');assert.equal(result.generationId,first.generationId);assert.equal(result.itemCount,10);assert.equal((await store.rankingItemsPage(first.generationId)).length,10);assert.equal((await store.get('games/g')).description.length,8000)})
test('emulator operator video cap remains enforced through snapshot batch method',async()=>{await seed();await assert.rejects(runControlledRanking({store,now:()=>new Date(),maximumVideos:1}),/ranking-operator-video-limit/);assert.equal(await store.get('rankingState/current'),null);assert.equal((await store.get('rankingState/build')).phase,'failed')})
test('emulator recovery is expiry-only and leaves pointer, original records and budget unchanged',async()=>{await seed();const real=Date.now(),base='f'.repeat(32);await store.transact(async tx=>tx.set('rankingState/current',{version:1,generationId:base,computedAt:new Date(real-3600000),publishedAt:new Date(real-3600000)}));const result=await stepRankingGeneration({store,now:()=>new Date(real)}),budgetPath='rankingBudgets/'+new Date(real).toISOString().slice(0,10),budget=await store.get(budgetPath),input={store,expectedId:result.generationId,expectedRevision:0,expectedBase:base};await assert.rejects(abandonExpiredRankingBuild({...input,now:()=>new Date(real)}),/still-active/);assert.equal((await abandonExpiredRankingBuild({...input,now:()=>new Date(real+segmentedRankingLimits.maxBuildMs+1)})).writes,3);assert.deepEqual(await store.get(budgetPath),budget);assert.equal((await store.get('rankingState/current')).generationId,base);assert.equal((await store.get('shorts/s0')).likeCount,2);assert.equal((await store.get('rankingState/build')).phase,'failed');assert.equal((await abandonExpiredRankingBuild({...input,now:()=>new Date(real+segmentedRankingLimits.maxBuildMs+2)})).writes,0)})

test('emulator accepts exactly sixteen projected snapshot documents without changing ordinary batch limits',async()=>{
 await seed();const page=await store.rankingSourcePage(),paths=['games/g',...Array.from({length:10},(_,n)=>'rankingMetrics/s'+n),...Array.from({length:5},(_,n)=>'games/missing'+n)],rows=await store.rankingSnapshotGetMany(paths,page.readTime)
 assert.equal(rows.length,16);assert.equal(rows[0].status,'active');assert.equal(rows[0].description,undefined);assert.equal(rows[7].shortId,'s6')
 await assert.rejects(store.rankingSnapshotGetMany([...paths,'games/seventeenth'],page.readTime),/inválido/);await assert.rejects(store.getMany(paths),/inválido/)
})
test('emulator shares per-game highlights with global top fifteen and live removals never leak or enable pagination',async()=>{
 const at=Date.now();await store.transact(async tx=>{
  tx.set('rankingState/metrics',{version:1,ready:true,epoch})
  for(let n=0;n<2;n++)tx.set('games/g'+n,{status:'active',officialName:'Game '+n,createdAt:new Date(at-3*86400000)})
  for(let n=0;n<40;n++){const id='s'+String(n).padStart(3,'0'),gameId='g'+n%2;tx.set('shorts/'+id,{gameId,moderationStatus:'published',title:'Clip '+n,platform:'Twitch',platformVideoId:'EmulatorHighlight'+n,normalizedUrl:'https://clips.twitch.tv/EmulatorHighlight'+n,likeCount:2,createdAt:new Date(at-86400000)});tx.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:n/40,commentMass:0,commentContributors:0,asOf:new Date(at-3600000)})}
 });const options={store,now:()=>new Date()};let result
 for(let n=0;n<10;n++){result=await stepRankingGeneration(options);if(result.status==='ready')break;assert.equal(await store.get('rankingState/current'),null)}
 assert.equal(result.status,'ready');assert.equal(result.itemCount,30);assert.equal(result.examined,40)
 const {readOrderedFeed}=await import('../../server/ranking/read-feed.ts'),global=await readOrderedFeed({order:'relevant'},options),game=await readOrderedFeed({order:'relevant',gameId:'g1'},options)
 assert.equal(global.items.length,15);assert.equal(global.items[0].id,'s039');assert.equal(global.next,null);assert.equal(game.items.length,15);assert.equal(game.next,null);assert.ok(game.items.every(v=>v.gameId==='g1'))
 await store.transact(async tx=>{const s=await tx.get('shorts/s039');tx.set('shorts/s039',{...s,moderationStatus:'removed'})})
 const refreshed=await readOrderedFeed({order:'relevant'},options);assert.equal(refreshed.items.length,14);assert.equal(refreshed.next,null);assert.ok(refreshed.items.every(v=>v.id!=='s039'))
})

test('emulator atomic admission and start contend safely at five retained generations',async()=>{
 await seed();const at=Date.now();await store.transact(async tx=>{for(let n=0;n<5;n++)tx.set('rankingRuns/'+n.toString(16).padStart(32,'0'),{version:1,status:'ready',startedAt:new Date(at-3*3600000),publishedAt:new Date(at-3*3600000)})})
 const {runBoundedRankingMaintenance}=await import('../../server/ranking/continuous-maintenance.ts'),options={store,now:()=>new Date()}
 await Promise.all([runBoundedRankingMaintenance(options),runBoundedRankingMaintenance(options)])
 const build=await store.get('rankingState/build'),budget=await store.get('rankingBudgets/'+new Date().toISOString().slice(0,10)),runs=await store.rankingRunsPage()
 assert.equal(runs.length,6);assert.ok(runs.some(v=>v.id===build.id));assert.equal(budget.readsReserved,936);assert.equal(budget.writesReserved,183);assert.equal((await store.get('maintenanceState/rankingAdmission')).observedRuns,5);assert.equal(await store.get('rankingState/current'),null)
})
test('emulator atomic query remains in its transaction and refuses after writes',async()=>{
 await seed();await store.transact(async tx=>{assert.deepEqual(await tx.rankingRunIds(6),[]);tx.set('rankingRuns/'+'c'.repeat(32),{status:'ready'});await assert.rejects(tx.rankingRunIds(6),/Reads must precede writes/)})
 await store.transact(async tx=>assert.deepEqual(await tx.rankingRunIds(6),['c'.repeat(32)]))
})
