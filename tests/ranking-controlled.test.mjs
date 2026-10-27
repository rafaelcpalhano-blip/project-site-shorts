import test from 'node:test'
import assert from 'node:assert/strict'
import {runControlledRanking} from '../server/ranking/controlled-generation.ts'
import {readOrderedFeed} from '../server/ranking/read-feed.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'

function fixture(count=9){
 let time=Date.parse('2026-10-27T08:00:00Z')
 const now=()=>new Date(time),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 docs.set('games/game',{officialName:'Game',status:'active',createdAt:new Date(time-3*86400000)})
 for(let n=0;n<count;n++){
  const id='s'+String(n).padStart(3,'0'),clip='RankingClip'+n
  docs.set('shorts/'+id,{gameId:'game',moderationStatus:'published',likeCount:2,createdAt:new Date(time-86400000),title:'Clip '+n,platform:'Twitch',platformVideoId:clip,normalizedUrl:'https://clips.twitch.tv/'+clip})
  docs.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId:'game',likeMass:n/10,commentMass:0,commentContributors:0,asOf:new Date(time-3600000)})
 }
 const rest=restFixture(docs,now),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:rest.fetcher})
 return {store,now,rest,advance:ms=>{time+=ms}}
}

test('controlled pilot promotes nine complete items and public reader keeps live visibility protections',async()=>{
 const d=fixture(),primary=structuredClone([...d.rest.docs])
 const result=await runControlledRanking(d)
 assert.equal(result.status,'ready');assert.equal(result.itemCount,9);assert.equal(result.steps.length,4);assert.equal(result.attemptedWrites,22)
 for(const [p,data]of primary)assert.deepEqual(d.rest.docs.get(p),data)
 for(const p of d.rest.docs.keys())assert.ok(primary.some(([key])=>key===p)||/^(rankingState|rankingBudgets|rankingRuns|rankingItems)\//.test(p))
 const feed=await readOrderedFeed({order:'relevant'},d)
 assert.deepEqual(feed.items.map(x=>x.id),Array.from({length:9},(_,n)=>'s'+String(8-n).padStart(3,'0')))
 d.rest.docs.get('shorts/s008').moderationStatus='removed'
 assert.equal((await readOrderedFeed({order:'relevant'},d)).items.some(x=>x.id==='s008'),false)
 d.rest.docs.get('games/game').status='hidden'
 assert.equal((await readOrderedFeed({order:'relevant'},d)).items.length,0)
})

test('controlled pilot refuses existing work and the race before claiming its own generation',async()=>{
 for(const race of [false,true]){
  const d=fixture(),get=d.store.get;let reads=0
  if(!race)d.rest.docs.set('rankingState/build',{phase:'scan'})
  else d.store.get=async p=>{if(p==='rankingState/build'&&++reads===2)d.rest.docs.set(p,{phase:'stage'});return get(p)}
  await assert.rejects(runControlledRanking(d),/ranking-operator-existing-build/)
  assert.equal(d.rest.docs.has('rankingState/current'),false)
  assert.equal([...d.rest.docs.keys()].some(p=>p.startsWith('rankingRuns/')),false)
 }
})

test('controlled pilot write cap aborts transaction without partial initial writes',async()=>{
 const d=fixture(),before=structuredClone([...d.rest.docs])
 await assert.rejects(runControlledRanking({...d,maximumWrites:1}),/ranking-operator-write-limit/)
 assert.deepEqual([...d.rest.docs],before)
})

test('controlled pilot step cap leaves staging private without promoting an incomplete generation',async()=>{
 const d=fixture(),r=await runControlledRanking({...d,maximumSteps:1})
 assert.equal(r.status,'stopped');assert.equal(r.reason,'step-limit');assert.equal(d.rest.docs.has('rankingState/current'),false)
 assert.equal(d.rest.docs.get('rankingState/build').phase,'scan')
 await assert.rejects(runControlledRanking(d),/ranking-operator-existing-build/)
})

test('controlled pilot source and video caps never promote truncated output or change primary data',async()=>{
 for(const limit of [{maximumSources:1},{maximumVideos:1}]){
  const d=fixture(2),primary=structuredClone([...d.rest.docs])
  await assert.rejects(runControlledRanking({...d,...limit}),/ranking-operator-(source|video)-limit/)
  assert.equal(d.rest.docs.has('rankingState/current'),false)
  for(const [p,data]of primary)assert.deepEqual(d.rest.docs.get(p),data)
 }
})

test('controlled pilot stops after time bound and does not restart a fresh published generation',async()=>{
 const d=fixture(),get=d.store.get;let reads=0
 d.store.get=async p=>{const row=await get(p);if(p==='rankingState/build'&&++reads===2)d.advance(120001);return row}
 await assert.rejects(runControlledRanking(d),/ranking-operator-time-limit/)
 assert.equal(d.rest.docs.has('rankingState/current'),false)
 const ready=fixture();await runControlledRanking(ready);const before=structuredClone([...ready.rest.docs])
 assert.equal((await runControlledRanking(ready)).status,'not-due');assert.deepEqual([...ready.rest.docs],before)
})
