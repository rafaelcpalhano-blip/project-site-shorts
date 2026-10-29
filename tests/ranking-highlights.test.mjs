import test from 'node:test'
import assert from 'node:assert/strict'
import {stepRankingGeneration} from '../server/ranking/segmented-generation.ts'
import {runBoundedRankingMaintenance} from '../server/ranking/continuous-maintenance.ts'
import {selectRankingHighlights,highlightsPolicy} from '../server/ranking/highlights.ts'
import {inspectRankingReadiness} from '../server/ranking/readiness.ts'
import {readOrderedFeed} from '../server/ranking/read-feed.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
function fixture(count=100,games=1,sources=count){
 let time=Date.parse('2026-10-28T12:00:00Z');const now=()=>new Date(time),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 for(let n=0;n<games;n++)docs.set('games/g'+n,{status:'active',officialName:'Game '+n,createdAt:new Date(time-3*86400000)})
 for(let n=0;n<sources;n++){const id='s'+String(n).padStart(3,'0'),gameId='g'+n%games;docs.set('shorts/'+id,{moderationStatus:n<count?'published':'removed',gameId,title:'Clip '+n,platform:'Twitch',platformVideoId:'HighlightClip'+n,normalizedUrl:'https://clips.twitch.tv/HighlightClip'+n,likeCount:2,createdAt:new Date(time-86400000)});docs.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:n/100,commentMass:0,commentContributors:0,asOf:new Date(time-3600000)})}
 const f=restFixture(docs,now),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:f.fetcher,lazyTransactions:true})
 return {now,f,store,advance:ms=>{time+=ms}}
}
async function generate(d){let result,steps=0;do{result=await stepRankingGeneration(d);assert.ok(++steps<=30);if(result.status!=='ready')assert.equal(d.f.docs.get('rankingState/current'),undefined);d.advance(60000)}while(result.status!=='ready');return {...result,steps}}
const stored=d=>[...d.f.docs].filter(([p])=>p.startsWith('rankingItems/')).map(([,v])=>v)

test('one game evaluates all 100 candidates and retains the best 15 including the last source page',async()=>{
 const d=fixture(),before=structuredClone([...d.f.docs]),ready=await inspectRankingReadiness(d),r=await generate(d)
 assert.equal(ready.highlightItems,15);assert.equal(ready.estimatedBuildSteps,r.steps);assert.equal(r.itemCount,15);assert.equal(r.examined,100)
 assert.deepEqual(stored(d).map(v=>v.shortId),Array.from({length:15},(_,n)=>'s'+String(99-n).padStart(3,'0')))
 for(const [p,v]of before)assert.deepEqual(d.f.docs.get(p),v)
 const page=await readOrderedFeed({order:'relevant'},d);assert.equal(page.items.length,15);assert.equal(page.next,null);assert.equal(page.items[0].id,'s099')
})
test('ten games with ten clips keep only their available clips, reuse them globally and never duplicate records',async()=>{
 const d=fixture(100,10),ready=await inspectRankingReadiness(d),r=await generate(d),items=stored(d)
 assert.equal(ready.highlightItems,100);assert.equal(r.itemCount,100);assert.equal(new Set(items.map(v=>v.shortId)).size,100)
 assert.equal((await readOrderedFeed({order:'relevant'},d)).items.length,15)
 const game=await readOrderedFeed({order:'relevant',gameId:'g0'},d);assert.equal(game.items.length,10);assert.equal(game.next,null);assert.ok(game.items.every(v=>v.gameId==='g0'))
})
test('five games with twenty clips keep 75 shared items with at most fifteen per game',async()=>{
 const d=fixture(100,5),ready=await inspectRankingReadiness(d),r=await generate(d)
 assert.equal(ready.highlightItems,75);assert.equal(r.itemCount,75);assert.equal(ready.estimatedBuildSteps,r.steps)
 for(let n=0;n<5;n++){const page=await readOrderedFeed({order:'relevant',gameId:'g'+n},d);assert.equal(page.items.length,15);assert.equal(page.next,null);assert.equal(stored(d).filter(v=>v.gameId==='g'+n).length,15)}
})
test('top selection has deterministic score/time/id tie breaks and does not mutate its input',()=>{
 const at=new Date('2026-10-28T00:00:00Z'),frames=Array.from({length:25},(_,n)=>({shortId:'s'+String(n).padStart(3,'0'),gameId:'g',score:1,createdAt:at})),before=structuredClone(frames)
 assert.deepEqual(selectRankingHighlights(frames).map(v=>v.shortId),Array.from({length:15},(_,n)=>'s'+String(24-n).padStart(3,'0')))
 const priority=[{shortId:'older',gameId:'g',score:2,createdAt:new Date(0)},{shortId:'newer',gameId:'g',score:1,createdAt:at}];assert.equal(selectRankingHighlights(priority)[0].shortId,'older');assert.deepEqual(frames,before);assert.equal(highlightsPolicy.intervalMs,45*60000)
})
test('an invalid metric outside the winning subset still blocks the entire generation',async()=>{
 const d=fixture();d.f.docs.get('rankingMetrics/s000').likeMass=-1
 await assert.rejects(generate(d),/ranking-invalid-metrics/);assert.equal(d.f.docs.get('rankingState/current'),undefined);assert.equal(stored(d).length,0)
})
test('worst case of 300 source documents and 100 eligible videos stays below 30 bounded steps',async()=>{
 const d=fixture(100,100,300),r=await generate(d);assert.equal(r.examined,300);assert.equal(r.itemCount,100);assert.ok(r.steps<=30)
})
test('relevant never returns a continuation even when old generations have more than 15 entries; other orders still paginate',async()=>{
 const d=fixture(40,4);await generate(d);const first=await readOrderedFeed({order:'relevant'},d);assert.equal(first.items.length,15);assert.equal(first.next,null)
 await assert.rejects(readOrderedFeed({order:'relevant',cursor:{scope:'relevant:*'}},d),/cursor-expired-or-mismatched/)
 const latest=await readOrderedFeed({order:'latest'},d);assert.equal(latest.items.length,15);assert.ok(latest.next)
})
test('idle tick avoids generator transactions, but an active build and scheduled retention cannot be bypassed',async()=>{
 const d=fixture(1);await generate(d);d.advance(60000);const before=structuredClone([...d.f.docs]),calls=d.f.calls();d.store.transact=async()=>{throw Error('unexpected-transaction')}
 assert.equal((await runBoundedRankingMaintenance(d)).status,'not-scheduled');assert.equal(d.f.calls()-calls,2);assert.deepEqual([...d.f.docs],before)
 d.f.docs.set('rankingState/build',{phase:'scan'});await assert.rejects(runBoundedRankingMaintenance(d),/invalid-checkpoint/)
 const retention=fixture(1);await generate(retention);retention.advance(Date.parse('2026-10-28T12:18:00Z')-retention.now().getTime());const r=await runBoundedRankingMaintenance(retention);assert.ok(['idle','pruned','protected'].includes(r.status));assert.ok(retention.f.docs.has('maintenanceState/rankingRetention'))
})
test('snapshot batches admit sixteen but reject seventeen and do not enlarge current-state or transaction batches',async()=>{
 const d=fixture(20,20),at=await d.store.rankingSourcePage(),paths=Array.from({length:16},(_,n)=>'games/g'+n)
 assert.equal((await d.store.rankingSnapshotGetMany(paths,at.readTime)).length,16)
 await assert.rejects(d.store.rankingSnapshotGetMany([...paths,'games/g16'],at.readTime),/inválido/)
 await assert.rejects(d.store.getMany(paths),/inválido/)
 await assert.rejects(d.store.transact(tx=>tx.getMany(paths)),/inválido/)
})

test('a staged legacy candidate exceeding fifteen per game is abandoned rather than publishing a mixed policy',async()=>{
 const d=fixture(40);await stepRankingGeneration(d);const build=d.f.docs.get('rankingState/build')
 build.phase='stage';build.examined=40;build.end=true;build.staged=1;build.frames=Array.from({length:20},(_,n)=>({shortId:'s'+String(n).padStart(3,'0'),gameId:'g0',score:1,createdAt:new Date(d.now()-86400000)}));build.snapshot=d.now().toISOString()
 d.f.docs.set('rankingItems/'+build.id+'_s000',{generationId:build.id,shortId:'s000'})
 await assert.rejects(stepRankingGeneration(d),/ranking-build-policy-changed/)
 assert.equal(d.f.docs.get('rankingState/build').phase,'failed');assert.equal(d.f.docs.get('rankingState/current'),undefined);assert.ok(d.f.docs.has('rankingItems/'+build.id+'_s000'))
})
