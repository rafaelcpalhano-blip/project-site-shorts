import type {AtomicStore} from '../firestore/atomic-store.ts'
import {runBoundedRankingMaintenance} from '../ranking/continuous-maintenance.ts'
import {stepRankingGeneration} from '../ranking/segmented-generation.ts'
import {pruneRankingGeneration} from '../ranking/retention.ts'
import {cleanupNetworkAbuse} from '../security/network-retention.ts'
import {cleanupLikes} from '../likes/retention.ts'
/** Called once by a trusted scheduled entry, never by an HTTP request.
 * One ranking step OR one bounded retention slice, with durable cursors.
 * No cron, timer, external queue or infrastructure is created here.
 */
export async function runWorkerMaintenance(options:{store:AtomicStore;now:()=>Date;mode?:'ranking-only'|'ranking-with-retention'}){
 if(options.mode==='ranking-with-retention')return runBoundedRankingMaintenance(options)
 const ranking=await stepRankingGeneration(options)
 if(ranking.status!=='not-due'||options.mode==='ranking-only')return {task:'ranking',...ranking}
 const slot=options.now().getUTCMinutes()%4
 if(slot===0)return {task:'network-retention',...await cleanupNetworkAbuse({...options,maximumRecords:8})}
 if(slot===3){
  const state=await options.store.get!('rankingState/build'),id=state?.cleanupGenerationId
  let candidate=typeof id==='string'&&/^[a-f0-9]{32}$/.test(id)?id:undefined
  let scanNext:string|null|undefined
  if(!candidate){
   if(!options.store.rankingRunsPage)throw Error('ranking-retention-unavailable')
   const cursor=await options.store.get!('maintenanceState/rankingRuns'),current=await options.store.get!('rankingState/current')
   const rows=await options.store.rankingRunsPage(typeof cursor?.after==='string'?cursor.after:undefined)
   if(rows.length>30||rows.some(row=>!/^[a-f0-9]{32}$/.test(row.id)))throw Error('ranking-invalid-cleanup-page')
   candidate=rows.find(row=>row.id!==current?.generationId&&row.id!==current?.previousGenerationId&&row.data.startedAt instanceof Date&&options.now().getTime()-row.data.startedAt.getTime()>=2*3600000)?.id
   scanNext=rows.length===30?rows.at(-1)!.id:null
  }
  if(!candidate){
   if(scanNext!==undefined)await options.store.transact(async tx=>{tx.set('maintenanceState/rankingRuns',{after:scanNext,updatedAt:options.now()})})
   return {task:'ranking-retention',status:'idle'}
  }
  const result=await pruneRankingGeneration({...options,generationId:candidate,maximumRecords:15})
  if(result.complete)await options.store.transact(async tx=>{const current=await tx.get('rankingState/build');if(current?.cleanupGenerationId===candidate)tx.set('rankingState/build',{...current,cleanupGenerationId:null})})
  return {task:'ranking-retention',...result}
 }
 const collection=slot===1?'shortLikes':'likeAttempts',key='maintenanceState/'+collection
 const previous=await options.store.get!(key),after=typeof previous?.after==='string'?previous.after:undefined
 const result=await cleanupLikes({...options,collection,after,maximumRecords:8,apply:true})
 await options.store.transact(async tx=>{const current=await tx.get(key);if((current?.after??null)===(after??null))tx.set(key,{after:result.next,updatedAt:options.now()})})
 return {task:'like-retention',...result}
}
