import type {AtomicStore} from '../firestore/atomic-store.ts'
import {readTransactionGroup} from '../firestore/transaction-reads.ts'
import {segmentedRankingLimits,validateRankingCheckpoint} from './segmented-generation.ts'
import {timestamp} from './metrics.ts'
/** Explicit operator-only recovery. No transport, credential, HTTP or scheduler
 * wiring. No deletes, budget refund, new generation or public pointer mutation. */
export async function abandonExpiredRankingBuild(options:{store:AtomicStore;now:()=>Date;expectedId:string;expectedRevision:number;expectedBase:string|null}){
 const {store,expectedId:id,expectedRevision:revision,expectedBase:base}=options
 if(!/^[a-f0-9]{32}$/.test(id)||!Number.isSafeInteger(revision)||revision<0||base!==null&&!/^[a-f0-9]{32}$/.test(base))throw Error('ranking-invalid-recovery-input')
 return store.transact(async tx=>{
  const [raw,lease,current,run]=await readTransactionGroup(tx,['rankingState/build','rankingState/lease','rankingState/current','rankingRuns/'+id])
  if(!raw)throw Error('ranking-recovery-missing-build')
  const saved=validateRankingCheckpoint(raw)
  if(saved.id!==id||saved.baseGeneration!==base||(current?.generationId??null)!==base||current?.generationId===id)throw Error('ranking-recovery-state-changed')
  if(saved.phase==='failed')return {status:'already-abandoned',writes:0}
  if(saved.phase!=='scan'&&saved.phase!=='stage'||saved.revision!==revision||run?.version!==1||run.status!=='building'||!(run.startedAt instanceof Date)||timestamp(run.startedAt)!==timestamp(saved.startedAt)||lease?.id!==id)throw Error('ranking-recovery-state-changed')
  const now=options.now(),point=timestamp(now)
  if(point-timestamp(saved.startedAt)<=segmentedRankingLimits.maxBuildMs||timestamp(lease.expiresAt)>point)throw Error('ranking-recovery-still-active')
  tx.set('rankingState/build',{...saved,phase:'failed',revision:saved.revision+1,buffer:[],frames:[],staged:0})
  tx.set('rankingRuns/'+id,{...run,status:'failed',failedAt:now,failureReason:'operator-abandoned-expired-build'})
  tx.set('rankingState/lease',{id,expiresAt:now})
  return {status:'abandoned',writes:3}
 })
}
