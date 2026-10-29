import {highlightsPolicy,selectRankingHighlights} from './highlights.ts'
import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import {rankingScore,timestamp} from './metrics.ts'
export const generationLimits=Object.freeze({videos:100,sourceDocuments:300,readsPerRun:762,writesPerRun:124,dailyReads:20000,dailyWrites:4000,leaseMs:300000,intervalMs:highlightsPolicy.intervalMs,maxBuildMs:1200000})
const amount=(record:RecordData|null,key:string)=>{if(!record)return 0;const value=record[key];if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-budget');return Number(value)}
function assertLease(lease:RecordData|null,id:string,now:Date){if(lease?.id!==id||timestamp(lease.expiresAt)<=timestamp(now))throw Error('ranking-lease-lost')}
export async function buildRankingGeneration(options:{store:AtomicStore;now:()=>Date}){
 const {store}=options
 if(!store.rankingSourcePage||!store.snapshotGet)throw Error('ranking-store-unavailable')
 const started=options.now(),id=crypto.randomUUID().replaceAll('-',''),day=started.toISOString().slice(0,10),leasePath='rankingState/lease'
 let meteredReads=0
 const reservation=await store.transact(async tx=>{
  meteredReads+=3
  const current=await tx.get('rankingState/current'),lease=await tx.get(leasePath),budget=await tx.get('rankingBudgets/'+day)
  if(current&&timestamp(started)-timestamp(current.publishedAt)<generationLimits.intervalMs)return {due:false,current}
  if(lease&&timestamp(lease.expiresAt)>timestamp(started))throw Error('ranking-build-busy')
  if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
  const reads=amount(budget,'readsReserved'),writes=amount(budget,'writesReserved')
  if(reads+generationLimits.readsPerRun>generationLimits.dailyReads||writes+generationLimits.writesPerRun>generationLimits.dailyWrites)throw Error('ranking-budget-exhausted')
  tx.set('rankingBudgets/'+day,{version:1,readsReserved:reads+generationLimits.readsPerRun,writesReserved:writes+generationLimits.writesPerRun,deletesReserved:amount(budget,'deletesReserved'),updatedAt:started})
  tx.set(leasePath,{id,expiresAt:new Date(timestamp(started)+generationLimits.leaseMs)})
  tx.create('rankingRuns/'+id,{version:1,status:'building',startedAt:started,readReservation:generationLimits.readsPerRun,writeReservation:generationLimits.writesPerRun})
  return {due:true,current}
 })
 if(!reservation.due)return {status:'not-due',generationId:reservation.current?.generationId as string}
 let examined=0,snapshot:string|undefined,after:string|undefined,metricsEpoch:string|null=null,checkedEpoch=false
 const frames:Array<{shortId:string;gameId:string;createdAt:Date;score:number}>=[],games=new Map<string,RecordData|null>()
 try{
  for(;;){
   if(timestamp(options.now())-timestamp(started)>generationLimits.maxBuildMs)throw Error('ranking-build-expired')
   const page=await store.rankingSourcePage(after,snapshot);snapshot=page.readTime;meteredReads+=Math.max(page.items.length,1)
   if(!checkedEpoch){meteredReads++;const state=await store.snapshotGet('rankingState/metrics',snapshot);if(state&&(state.version!==1||state.ready!==true||typeof state.epoch!=='string'))throw Error('ranking-metrics-not-ready');metricsEpoch=typeof state?.epoch==='string'?state.epoch:null;checkedEpoch=true}
   for(const row of page.items){
    if(!/^[-_a-zA-Z0-9]{1,128}$/.test(row.id))throw Error('ranking-invalid-source')
    if(++examined>generationLimits.sourceDocuments)throw Error('ranking-source-limit')
    if(row.data.moderationStatus!=='published')continue
    if(typeof row.data.gameId!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(row.data.gameId))throw Error('ranking-invalid-game')
    if(!games.has(row.data.gameId)){meteredReads++;games.set(row.data.gameId,await store.snapshotGet('games/'+row.data.gameId,snapshot))}
    const game=games.get(row.data.gameId)
    if(game?.status!=='active')continue
    if(frames.length>=generationLimits.videos)throw Error('ranking-video-limit')
    if(row.data.likeCount===undefined)throw Error('ranking-preparation-required')
    meteredReads++
    const metric=await store.snapshotGet('rankingMetrics/'+row.id,snapshot)
    if(metricsEpoch&&metric?.epoch!==metricsEpoch)throw Error('ranking-metrics-not-ready')
    frames.push({shortId:row.id,gameId:row.data.gameId,createdAt:new Date(timestamp(row.data.createdAt)),score:rankingScore(row.data,game,metric,row.id,new Date(snapshot))})
   }
   if(page.items.length<30)break
   after=page.items.at(-1)!.id
  }
  const selected=selectRankingHighlights(frames),computedAt=new Date(snapshot!)
  for(let offset=0;offset<selected.length;offset+=20){
   const chunk=selected.slice(offset,offset+20),now=options.now()
   if(timestamp(now)-timestamp(started)>generationLimits.maxBuildMs)throw Error('ranking-build-expired')
   await store.transact(async tx=>{
    meteredReads++
    const lease=await tx.get(leasePath);assertLease(lease,id,now)
    for(const frame of chunk){
     const itemId=id+'_'+frame.shortId
     tx.create('rankingItems/'+itemId,{...frame,version:1,generationId:id,computedAt})
    }
    tx.set(leasePath,{id,expiresAt:new Date(timestamp(now)+generationLimits.leaseMs)})
   })
  }
  const publishedAt=options.now()
  if(timestamp(publishedAt)-timestamp(started)>generationLimits.maxBuildMs)throw Error('ranking-build-expired')
  await store.transact(async tx=>{
   meteredReads+=5
   const lease=await tx.get(leasePath),run=await tx.get('rankingRuns/'+id),current=await tx.get('rankingState/current'),budget=await tx.get('rankingBudgets/'+day),metrics=await tx.get('rankingState/metrics')
   if(metricsEpoch&&(metrics?.ready!==true||metrics.epoch!==metricsEpoch))throw Error('ranking-metrics-not-ready')
   assertLease(lease,id,publishedAt)
   if(run?.status!=='building'||current?.generationId!==reservation.current?.generationId)throw Error('ranking-publication-conflict')
   const chargedReads=Math.min(generationLimits.readsPerRun,meteredReads+32),reserved=amount(budget,'readsReserved')
   if(reserved<generationLimits.readsPerRun)throw Error('ranking-invalid-budget')
   tx.set('rankingBudgets/'+day,{...budget,readsReserved:reserved-generationLimits.readsPerRun+chargedReads,updatedAt:publishedAt})
   tx.set('rankingRuns/'+id,{...run,status:'ready',readCharge:chargedReads,snapshotAt:snapshot!,computedAt,publishedAt,itemCount:selected.length,examined})
   tx.set('rankingState/current',{version:1,generationId:id,metricsEpoch,computedAt,publishedAt,itemCount:selected.length,previousGenerationId:current?.generationId??null})
   tx.set(leasePath,{id,expiresAt:publishedAt})
  })
  return {status:'ready',generationId:id,itemCount:selected.length,examined,snapshotAt:snapshot!}
 }catch(failure){
  // Staging is never public. A retry uses a new generation; the old pointer is preserved.
  try{await store.transact(async tx=>{
   const lease=await tx.get(leasePath),run=await tx.get('rankingRuns/'+id)
   if(!run||run.status!=='building')return
   tx.set('rankingRuns/'+id,{...run,status:'failed',examined,failedAt:options.now()})
   if(lease?.id===id)tx.set(leasePath,{id,expiresAt:options.now()})
  })}catch{/* Preserve original error and the lease expiry as recovery boundary. */}
  throw failure
 }
}
