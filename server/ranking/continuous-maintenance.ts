import type {AtomicStore} from '../firestore/atomic-store.ts'
import {readTransactionPair} from '../firestore/transaction-reads.ts'
import {generationLimits} from './generation.ts'
import {timestamp} from './metrics.ts'
import {segmentedRankingLimits,stepRankingGenerationFromCheckpoint} from './segmented-generation.ts'
import {maintainRankingRetention} from './maintenance-retention.ts'

import {rankingBackpressureLimits} from './atomic-admission.ts'
export {rankingBackpressureLimits} from './atomic-admission.ts'
const admissionPath='maintenanceState/rankingAdmission'
/** Conservative admission for new builds only. An unavailable or stale check
 * never permits a new generation. Existing builds and the public pointer survive. */
export async function inspectRankingAdmission(options:{store:AtomicStore;now:()=>Date}){
 const {store}=options,now=options.now(),point=timestamp(now),day=now.toISOString().slice(0,10),nonce=crypto.randomUUID().replaceAll('-','')
 if(!store.rankingRunsPage)throw Error('ranking-retention-unavailable')
 const claim=await store.transact(async tx=>{
  const [state,budget]=await readTransactionPair(tx,admissionPath,'rankingBudgets/'+day)
  if(state&&(state.version!==1||typeof state.allowed!=='boolean'||typeof state.nonce!=='string'||!/^[a-f0-9]{32}$/.test(state.nonce)||!(state.checkedAt instanceof Date)||timestamp(state.checkedAt)>point))throw Error('ranking-invalid-admission')
  if(state&&!state.allowed&&point-timestamp(state.checkedAt)<rankingBackpressureLimits.recheckMs)return false
  if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
  const amount=(key:string)=>{const value=budget?budget[key]:0;if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-budget');return Number(value)}
  const reads=amount('readsReserved'),writes=amount('writesReserved'),deletes=amount('deletesReserved')
  if(reads+rankingBackpressureLimits.readReservation>generationLimits.dailyReads||writes+rankingBackpressureLimits.writeReservation>generationLimits.dailyWrites)throw Error('ranking-budget-exhausted')
  tx.set('rankingBudgets/'+day,{version:1,readsReserved:reads+rankingBackpressureLimits.readReservation,writesReserved:writes+rankingBackpressureLimits.writeReservation,deletesReserved:deletes,updatedAt:now})
  tx.set(admissionPath,{version:1,nonce,allowed:false,checkedAt:now});return true
 })
 if(!claim)return {allowed:false,reason:'backlog-recheck-wait'}
 const rows=await store.rankingRunsPage();let previous=''
 if(rows.length>30)throw Error('ranking-invalid-cleanup-page')
 for(const row of rows){if(!/^[a-f0-9]{32}$/.test(row.id)||row.id<=previous)throw Error('ranking-invalid-cleanup-page');previous=row.id}
 const allowed=rows.length<rankingBackpressureLimits.maximumRetainedGenerations
 await store.transact(async tx=>{const state=await tx.get(admissionPath);if(state?.nonce!==nonce)throw Error('ranking-admission-changed');tx.set(admissionPath,{...state,allowed,observedRuns:rows.length})})
 return {allowed,reason:allowed?'capacity-available':'retention-backlog'}
}

/** Opt-in scheduled mode only. Retention can proceed even while a new build is
 * paused for storage pressure; no additional deletion or free quota is allowed. */
export async function runBoundedRankingMaintenance(options:{store:AtomicStore;now:()=>Date}){
 const {store}=options
 if(!store.get)throw Error('ranking-store-unavailable')
 const build=await store.get('rankingState/build')
 // Let the generation validator handle active and malformed checkpoints.
 if(build&&!['ready','failed'].includes(String(build.phase)))return {task:'ranking',...await stepRankingGenerationFromCheckpoint({...options,singleUtcDay:true},build)}
 const now=options.now()
 if(86400000-(timestamp(now)%86400000)<=segmentedRankingLimits.maxBuildMs)return {task:'ranking-retention',...await maintainRankingRetention(options),rankingPaused:'utc-day-boundary'}
 const current=await store.get('rankingState/current')
 // An idle tick has no writes to authorize. Keep retention scheduled, but avoid
 // opening a generator transaction solely to rediscover the interval gate.
 if(current&&timestamp(now)>=timestamp(current.computedAt??current.publishedAt)&&timestamp(now)-timestamp(current.computedAt??current.publishedAt)<generationLimits.intervalMs)return {task:'ranking-retention',...await maintainRankingRetention(options)}
 if(!current||timestamp(now)-timestamp(current.computedAt??current.publishedAt)>=generationLimits.intervalMs){
  if(store.atomicRankingAdmission){
   const result=await stepRankingGenerationFromCheckpoint({...options,singleUtcDay:true,atomicAdmission:true},build)
   if(result.status==='admission-wait'||result.status==='admission-blocked')return {task:'ranking-retention',...await maintainRankingRetention(options),rankingPaused:result.status==='admission-wait'?'backlog-recheck-wait':'retention-backlog'}
   return {task:'ranking',...result}
  }
  const gate=await inspectRankingAdmission(options)
  if(!gate.allowed)return {task:'ranking-retention',...await maintainRankingRetention(options),rankingPaused:gate.reason}
 }
 const ranking=await stepRankingGenerationFromCheckpoint({...options,singleUtcDay:true},build)
 if(ranking.status!=='not-due')return {task:'ranking',...ranking}
 return {task:'ranking-retention',...await maintainRankingRetention(options)}
}
