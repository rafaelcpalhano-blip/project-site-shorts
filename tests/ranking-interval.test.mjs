import test from 'node:test'
import assert from 'node:assert/strict'
import {generationLimits,buildRankingGeneration} from '../server/ranking/generation.ts'
import {stepRankingGeneration} from '../server/ranking/segmented-generation.ts'
import {inspectRankingReadiness} from '../server/ranking/readiness.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'

function fixture(age,delayedPublication=0){
 const computedAt=new Date('2026-10-27T12:00:00Z'),now=()=>new Date(computedAt.getTime()+age),epoch='a'.repeat(32)
 const docs=new Map([
  ['rankingState/metrics',{version:1,ready:true,epoch}],
  ['rankingState/current',{version:1,generationId:'b'.repeat(32),metricsEpoch:epoch,computedAt,publishedAt:new Date(computedAt.getTime()+delayedPublication)}],
 ])
 const rest=restFixture(docs,now),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:rest.fetcher})
 return {store,now,rest}
}

test('ranking 30-minute gate preserves current result without writes until the exact boundary',async()=>{
 assert.equal(generationLimits.intervalMs,30*60000)
 for(const generate of [stepRankingGeneration,buildRankingGeneration]){
  const d=fixture(30*60000-1),before=structuredClone([...d.rest.docs])
  assert.equal((await inspectRankingReadiness(d)).status,'not-due')
  assert.equal((await generate(d)).status,'not-due')
  assert.deepEqual([...d.rest.docs],before)
 }
})

test('ranking becomes due at 30 minutes without changing the previous public pointer before completion',async()=>{
 const d=fixture(30*60000),previous=structuredClone(d.rest.docs.get('rankingState/current'))
 assert.equal((await inspectRankingReadiness(d)).status,'ready')
 assert.equal((await stepRankingGeneration(d)).status,'building')
 assert.deepEqual(d.rest.docs.get('rankingState/current'),previous)
 const legacy=fixture(30*60000)
 assert.equal((await buildRankingGeneration(legacy)).status,'ready')
})

test('segmented 30-minute cadence follows snapshot age even if publication was delayed',async()=>{
 const d=fixture(30*60000,26*60000)
 assert.equal((await inspectRankingReadiness(d)).status,'ready')
 assert.equal((await stepRankingGeneration(d)).status,'building')
})

test('more frequent ranking keeps the daily budget guard and public pointer intact',async()=>{
 const d=fixture(30*60000),previous=structuredClone(d.rest.docs.get('rankingState/current'))
 d.rest.docs.set('rankingBudgets/2026-10-27',{version:1,readsReserved:generationLimits.dailyReads,writesReserved:0,deletesReserved:0})
 const before=structuredClone([...d.rest.docs])
 assert.equal((await inspectRankingReadiness(d)).reason,'ranking-budget-exhausted')
 await assert.rejects(stepRankingGeneration(d),/ranking-budget-exhausted/)
 assert.deepEqual([...d.rest.docs],before);assert.deepEqual(d.rest.docs.get('rankingState/current'),previous)
})
