import type {AtomicStore} from '../firestore/atomic-store.ts'
import {generationLimits} from './generation.ts'
import {pruneRankingGeneration} from './retention.ts'
import {timestamp} from './metrics.ts'

const cursorPath='maintenanceState/rankingRetention'
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id)
/** Trusted maintenance only. Discovery is metered before scanning; one slice
 * per quarter-hour slot. Never touches likes, comments, network or primary data. */
export async function maintainRankingRetention(options:{store:AtomicStore;now:()=>Date}){
 const {store}=options,now=options.now(),point=timestamp(now)
 if(now.getUTCMinutes()%15!==3)return {status:'not-scheduled'}
 if(!store.get||!store.rankingRunsPage)throw Error('ranking-retention-unavailable')
 const day=now.toISOString().slice(0,10),slot=Math.floor(point/900000)
 const claimed=await store.transact(async tx=>{
  const state=await tx.get(cursorPath),budget=await tx.get('rankingBudgets/'+day)
  if(state&&(state.version!==1||!Number.isSafeInteger(state.slot)||Number(state.slot)<0||Number(state.slot)>slot||state.after!==null&&!validId(state.after)||state.candidate!==null&&!validId(state.candidate)))throw Error('ranking-invalid-retention-cursor')
  if(state?.slot===slot)return null
  if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
  const amount=(key:string)=>{const value=budget?budget[key]:0;if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-budget');return Number(value)}
  const reads=amount('readsReserved'),writes=amount('writesReserved'),deletes=amount('deletesReserved')
  if(reads+40>generationLimits.dailyReads||writes+3>generationLimits.dailyWrites)throw Error('ranking-budget-exhausted')
  const next={version:1,slot,after:state?.after??null,candidate:state?.candidate??null,updatedAt:now}
  tx.set('rankingBudgets/'+day,{version:1,readsReserved:reads+40,writesReserved:writes+3,deletesReserved:deletes,updatedAt:now})
  tx.set(cursorPath,next);return next
 })
 if(!claimed)return {status:'already-checked'}
 let candidate=validId(claimed.candidate)?claimed.candidate:undefined,after=claimed.after
 if(!candidate){
  const current=await store.get('rankingState/current'),rows=await store.rankingRunsPage(typeof after==='string'?after:undefined)
  let prior=typeof after==='string'?after:''
  if(rows.length>30)throw Error('ranking-invalid-cleanup-page')
  for(const row of rows){if(!validId(row.id)||row.id<=prior)throw Error('ranking-invalid-cleanup-page');prior=row.id}
  candidate=rows.find(row=>row.id!==current?.generationId&&row.id!==current?.previousGenerationId&&row.data.startedAt instanceof Date&&point-timestamp(row.data.startedAt)>=2*3600000)?.id
  // Do not skip the rest of a page when one candidate was selected.
  if(!candidate)after=rows.length===30?rows.at(-1)!.id:null
 }
 let result:{deleted:number;complete:boolean;hasMore?:boolean}|undefined,protectedGeneration=false
 if(candidate){
  try{result=await pruneRankingGeneration({...options,generationId:candidate,maximumRecords:15})}
  catch(error){if(!(error instanceof Error)||error.message!=='ranking-generation-protected')throw error;protectedGeneration=true}
 }
 await store.transact(async tx=>{const state=await tx.get(cursorPath);if(state?.slot!==slot||state.after!==claimed.after||state.candidate!==claimed.candidate)throw Error('ranking-retention-cursor-changed');tx.set(cursorPath,{...state,after,candidate:result&&!result.complete?candidate:null,updatedAt:options.now()})})
 return result?{status:'pruned',...result}:{status:protectedGeneration?'protected':'idle'}
}
