import type {AtomicStore} from '../firestore/atomic-store.ts'
import {timestamp} from './metrics.ts'
import {generationLimits} from './generation.ts'
export async function pruneRankingGeneration(options:{store:AtomicStore;now:()=>Date;generationId:string}){
 const {store,generationId:id}=options
 if(!/^[a-f0-9]{32}$/.test(id)||!store.rankingItemsPage)throw Error('ranking-invalid-cleanup')
 const rows=await store.rankingItemsPage(id)
 if(rows.length>30||rows.some(row=>!/^[-_a-zA-Z0-9]{1,192}$/.test(row.id)||row.data.generationId!==id))throw Error('ranking-invalid-page')
 return store.transact(async tx=>{
  const now=options.now(),current=await tx.get('rankingState/current'),run=await tx.get('rankingRuns/'+id),lease=await tx.get('rankingState/lease'),day=now.toISOString().slice(0,10),budget=await tx.get('rankingBudgets/'+day)
  if(!run){if(rows.length)throw Error('ranking-run-missing');return {deleted:0,complete:true}}
  if(current?.generationId===id||current?.previousGenerationId===id||timestamp(now)-timestamp(run.publishedAt??run.startedAt)<2*3600000||lease?.id===id&&timestamp(lease.expiresAt)>timestamp(now))throw Error('ranking-generation-protected')
  const records=[]
  for(const row of rows){const data=await tx.get('rankingItems/'+row.id);if(data){if(data.generationId!==id)throw Error('ranking-invalid-page');records.push(row.id)}}
  if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
  const number=(key:string)=>{if(!budget)return 0;const value=budget[key];if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-budget');return Number(value)}
  const reads=number('readsReserved'),writes=number('writesReserved'),deletes=number('deletesReserved'),removed=records.length+(rows.length<30?1:0)
  if(reads+70>generationLimits.dailyReads||writes+3>generationLimits.dailyWrites||deletes+removed>4000)throw Error('ranking-budget-exhausted')
  if(!tx.delete)throw Error('ranking-store-unavailable')
  for(const itemId of records)tx.delete('rankingItems/'+itemId)
  if(lease?.id===id)tx.set('rankingState/lease',{id:'pruned-'+id,expiresAt:now})
  if(rows.length<30)tx.delete('rankingRuns/'+id)
  else tx.set('rankingRuns/'+id,{...run,status:'pruning'})
  tx.set('rankingBudgets/'+day,{version:1,readsReserved:reads+70,writesReserved:writes+3,deletesReserved:deletes+removed,updatedAt:now})
  return {deleted:removed,complete:rows.length<30,hasMore:rows.length===30}
 })
}
