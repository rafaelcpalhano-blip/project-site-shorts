import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import {generationLimits} from './generation.ts'
import {rankingScore,timestamp} from './metrics.ts'

const path='rankingState/build',leasePath='rankingState/lease'
export const segmentedRankingLimits=Object.freeze({sourcePerStep:15,stagePerStep:20,readReservation:900,writeReservation:180,maxBuildMs:30*60000})
type Frame={shortId:string;gameId:string;createdAt:Date;score:number}
interface Checkpoint extends RecordData {
 version:1;id:string;revision:number;phase:'scan'|'stage'|'ready'|'failed';startedAt:Date;day:string
 baseGeneration:string|null;epoch:string;snapshot:string|null;after:string|null
 buffer:Array<{id:string;data:RecordData}>;end:boolean;frames:Frame[];staged:number;examined:number;reads:number
}
const number=(record:RecordData|null,key:string)=>{const value=record?.[key]??0;if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-budget');return Number(value)}
function checkpoint(value:RecordData):Checkpoint{
 if(value.version!==1||typeof value.id!=='string'||!/^[a-f0-9]{32}$/.test(value.id)||!Number.isSafeInteger(value.revision)||Number(value.revision)<0||!['scan','stage','ready','failed'].includes(String(value.phase))||
  !(value.startedAt instanceof Date)||typeof value.day!=='string'||value.day!==value.startedAt.toISOString().slice(0,10)||typeof value.epoch!=='string'||!/^[a-f0-9]{32}$/.test(value.epoch)||
  !Array.isArray(value.frames)||value.frames.length>100||!Array.isArray(value.buffer)||value.buffer.length>30||!Number.isSafeInteger(value.staged)||Number(value.staged)<0||Number(value.staged)>value.frames.length||
  !Number.isSafeInteger(value.examined)||Number(value.examined)<0||Number(value.examined)>300||!Number.isSafeInteger(value.reads)||Number(value.reads)<0||
  value.snapshot!==null&&(typeof value.snapshot!=='string'||!Number.isFinite(Date.parse(value.snapshot)))||value.after!==null&&(typeof value.after!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(value.after))||
  value.baseGeneration!==null&&(typeof value.baseGeneration!=='string'||!/^[a-f0-9]{32}$/.test(value.baseGeneration))||typeof value.end!=='boolean')throw Error('ranking-invalid-checkpoint')
 if(new TextEncoder().encode(JSON.stringify(value)).length>131072)throw Error('ranking-checkpoint-too-large')
 const ids=new Set<string>()
 for(const frame of value.frames as Frame[]){if(!/^[-_a-zA-Z0-9]{1,128}$/.test(frame.shortId)||ids.has(frame.shortId)||!/^[-_a-zA-Z0-9]{1,128}$/.test(frame.gameId)||!Number.isFinite(frame.score)||frame.score<0)throw Error('ranking-invalid-checkpoint');timestamp(frame.createdAt);ids.add(frame.shortId)}
 return value as Checkpoint
}
function leaseMatches(lease:RecordData|null,id:string,now:Date){if(lease?.id!==id||timestamp(lease.expiresAt)<=timestamp(now))throw Error('ranking-lease-lost')}
function epochMatches(state:RecordData|null,epoch:string){if(state?.version!==1||state.ready!==true||state.epoch!==epoch)throw Error('ranking-metrics-not-ready')}
/** One bounded step per invocation, no visitor endpoint. Checkpoint and staging
 * advance atomically; a lost response is recovered by rereading durable state.
 * No public pointer changes until every source and staged item is complete.
 */
export async function stepRankingGeneration(options:{store:AtomicStore;now:()=>Date}){
 const {store}=options
 if(!store.get||!store.rankingSourcePage||!store.snapshotGet)throw Error('ranking-store-unavailable')
 const now=options.now();timestamp(now)
 const raw=await store.get(path),prior=raw?checkpoint(raw):null
 if(!prior||prior.phase==='ready'||prior.phase==='failed')return store.transact(async tx=>{
  const active=await tx.get(path),lease=await tx.get(leasePath),current=await tx.get('rankingState/current'),budget=await tx.get('rankingBudgets/'+now.toISOString().slice(0,10)),metrics=await tx.get('rankingState/metrics')
  if(active&&['scan','stage'].includes(String(active.phase)))return {status:'busy'}
  if(current&&timestamp(now)-timestamp(current.computedAt??current.publishedAt)<generationLimits.intervalMs)return {status:'not-due'}
  if(lease&&timestamp(lease.expiresAt)>timestamp(now))throw Error('ranking-build-busy')
  if(metrics?.version!==1||metrics.ready!==true||typeof metrics.epoch!=='string'||!/^[a-f0-9]{32}$/.test(metrics.epoch))throw Error('ranking-metrics-not-ready')
  if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
  const reads=number(budget,'readsReserved'),writes=number(budget,'writesReserved')
  if(reads+segmentedRankingLimits.readReservation>generationLimits.dailyReads||writes+segmentedRankingLimits.writeReservation>generationLimits.dailyWrites)throw Error('ranking-budget-exhausted')
  const id=crypto.randomUUID().replaceAll('-',''),day=now.toISOString().slice(0,10)
  const next:Checkpoint={version:1,id,revision:0,phase:'scan',startedAt:now,day,baseGeneration:typeof current?.generationId==='string'?current.generationId:null,cleanupGenerationId:current?.previousGenerationId??null,epoch:metrics.epoch,snapshot:null,after:null,buffer:[],end:false,frames:[],staged:0,examined:0,reads:6}
  tx.set('rankingBudgets/'+day,{version:1,readsReserved:reads+segmentedRankingLimits.readReservation,writesReserved:writes+segmentedRankingLimits.writeReservation,deletesReserved:number(budget,'deletesReserved'),updatedAt:now})
  tx.set(leasePath,{id,expiresAt:new Date(timestamp(now)+generationLimits.leaseMs)})
  tx.create('rankingRuns/'+id,{version:1,status:'building',startedAt:now,segmented:true,readReservation:segmentedRankingLimits.readReservation,writeReservation:segmentedRankingLimits.writeReservation})
  tx.set(path,next);return {status:'building',generationId:id}
 })
 const expected=prior.revision
 const update=async(next:Checkpoint,items:Frame[]=[])=>store.transact(async tx=>{
  const saved=await tx.get(path),lease=await tx.get(leasePath),metrics=await tx.get('rankingState/metrics')
  if(saved?.id!==prior.id||saved.revision!==expected)throw Error('ranking-step-conflict')
  leaseMatches(lease,prior.id,options.now());epochMatches(metrics,prior.epoch)
  checkpoint(next)
  for(const frame of items)tx.create('rankingItems/'+prior.id+'_'+frame.shortId,{...frame,version:1,generationId:prior.id,computedAt:new Date(next.snapshot!)})
  tx.set(path,next);tx.set(leasePath,{id:prior.id,expiresAt:new Date(timestamp(options.now())+generationLimits.leaseMs)})
  return {status:'building',generationId:prior.id,phase:next.phase,examined:next.examined,staged:next.staged}
 })
 try{
  if(timestamp(now)<timestamp(prior.startedAt)||timestamp(now)-timestamp(prior.startedAt)>segmentedRankingLimits.maxBuildMs)throw Error('ranking-build-expired')
  if(prior.phase==='scan'){
   const next=structuredClone(prior);next.revision++;next.reads+=4
   if(!next.buffer.length&&!next.end){
    const page=await store.rankingSourcePage(next.after??undefined,next.snapshot??undefined)
    if(page.items.length>30||next.snapshot&&next.snapshot!==page.readTime||!Number.isFinite(Date.parse(page.readTime)))throw Error('ranking-invalid-source')
    next.snapshot=page.readTime;next.reads+=Math.max(page.items.length,1)
    if(!prior.snapshot){const state=await store.snapshotGet('rankingState/metrics',page.readTime);epochMatches(state,prior.epoch);next.reads++}
    let after=next.after
    for(const row of page.items){if(!/^[-_a-zA-Z0-9]{1,128}$/.test(row.id)||after!==null&&row.id<=after)throw Error('ranking-invalid-source');after=row.id}
    next.after=after;next.buffer=page.items;next.end=page.items.length<30
   }
   const consumed=next.buffer.splice(0,segmentedRankingLimits.sourcePerStep)
   for(const row of consumed){
    if(++next.examined>generationLimits.sourceDocuments)throw Error('ranking-source-limit')
    if(row.data.moderationStatus!=='published')continue
    if(typeof row.data.gameId!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(row.data.gameId))throw Error('ranking-invalid-game')
    const game=await store.snapshotGet('games/'+row.data.gameId,next.snapshot!);next.reads++
    if(game?.status!=='active')continue
    if(next.frames.length>=generationLimits.videos)throw Error('ranking-video-limit')
    if(row.data.likeCount===undefined)throw Error('ranking-preparation-required')
    const metric=await store.snapshotGet('rankingMetrics/'+row.id,next.snapshot!);next.reads++
    if(metric?.epoch!==next.epoch)throw Error('ranking-metrics-not-ready')
    next.frames.push({shortId:row.id,gameId:row.data.gameId,createdAt:new Date(timestamp(row.data.createdAt)),score:rankingScore(row.data,game,metric,row.id,new Date(next.snapshot!))})
   }
   if(next.end&&!next.buffer.length)next.phase='stage'
   return await update(next)
  }
  if(prior.staged<prior.frames.length){const next=structuredClone(prior),items=next.frames.slice(next.staged,next.staged+segmentedRankingLimits.stagePerStep);next.revision++;next.staged+=items.length;next.reads+=4;return await update(next,items)}
  return await store.transact(async tx=>{
   const saved=await tx.get(path),lease=await tx.get(leasePath),metrics=await tx.get('rankingState/metrics'),current=await tx.get('rankingState/current'),run=await tx.get('rankingRuns/'+prior.id),budget=await tx.get('rankingBudgets/'+prior.day)
   const publishedAt=options.now()
   if(saved?.id!==prior.id||saved.revision!==expected)throw Error('ranking-step-conflict')
   leaseMatches(lease,prior.id,publishedAt);epochMatches(metrics,prior.epoch)
   if(timestamp(publishedAt)-timestamp(prior.startedAt)>segmentedRankingLimits.maxBuildMs||run?.status!=='building'||(current?.generationId??null)!==prior.baseGeneration||prior.staged!==prior.frames.length||!prior.snapshot)throw Error('ranking-publication-conflict')
   const reserved=number(budget,'readsReserved'),charge=Math.min(segmentedRankingLimits.readReservation,prior.reads+40)
   if(budget?.version!==1||reserved<segmentedRankingLimits.readReservation)throw Error('ranking-invalid-budget')
   const writeReserved=number(budget,'writesReserved'),writeCharge=Math.min(segmentedRankingLimits.writeReservation,9+2*prior.revision+prior.frames.length)
   if(writeReserved<segmentedRankingLimits.writeReservation)throw Error('ranking-invalid-budget')
   tx.set('rankingBudgets/'+prior.day,{...budget,readsReserved:reserved-segmentedRankingLimits.readReservation+charge,writesReserved:writeReserved-segmentedRankingLimits.writeReservation+writeCharge,updatedAt:publishedAt})
   tx.set('rankingRuns/'+prior.id,{...run,status:'ready',readCharge:charge,snapshotAt:prior.snapshot,computedAt:new Date(prior.snapshot),publishedAt,itemCount:prior.frames.length,examined:prior.examined})
   tx.set('rankingState/current',{version:1,generationId:prior.id,metricsEpoch:prior.epoch,computedAt:new Date(prior.snapshot),publishedAt,itemCount:prior.frames.length,previousGenerationId:current?.generationId??null})
   tx.set(leasePath,{id:prior.id,expiresAt:publishedAt});tx.set(path,{...prior,revision:prior.revision+1,phase:'ready',buffer:[],frames:[],staged:0})
   return {status:'ready',generationId:prior.id,itemCount:prior.frames.length,examined:prior.examined}
  })
 }catch(error){
  if(error instanceof Error&&error.message==='ranking-step-conflict')return {status:'busy'}
  // Transient transport/quota failure leaves durable progress for the next tick.
  // Terminal state/lease errors abandon staging without touching the public pointer.
  if(error instanceof Error&&/^ranking-/.test(error.message))try{await store.transact(async tx=>{
   const saved=await tx.get(path),lease=await tx.get(leasePath),run=await tx.get('rankingRuns/'+prior.id)
   if(saved?.id!==prior.id||saved.revision!==expected||!run||run.status!=='building')return
   tx.set(path,{...prior,revision:prior.revision+1,phase:'failed',buffer:[],frames:[],staged:0});tx.set('rankingRuns/'+prior.id,{...run,status:'failed',failedAt:options.now()})
   if(lease?.id===prior.id)tx.set(leasePath,{id:prior.id,expiresAt:options.now()})
  })}catch{/* Quota or CPU interruption may prevent bookkeeping; no pointer was promoted. */}
  throw error
 }
}
