import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import {generationLimits} from './generation.ts'
import {segmentedRankingLimits} from './segmented-generation.ts'
import {rankingScore,timestamp} from './metrics.ts'

/** Read-only preflight. No lease, transaction, repair, staging or public pointer writes.
 * Snapshot consistency does not reserve capacity or guarantee a later build. */
export async function inspectRankingReadiness(options:{store:AtomicStore;now:()=>Date;maximumSources?:number}){
 const stats={sourceDocuments:0,eligibleVideos:0,unpublishedSkipped:0,inactiveGameSkipped:0,uniqueGamesRead:0,sourcePages:0,modeledDocumentReads:0}
 const maximum=options.maximumSources??generationLimits.sourceDocuments
 if(!Number.isSafeInteger(maximum)||maximum<1||maximum>generationLimits.sourceDocuments)throw Error('ranking-invalid-inspection-limit')
 const {store}=options
 if(!store.get||!store.snapshotGet||!store.rankingSourcePage)throw Error('ranking-inspection-unavailable')
 const now=options.now();timestamp(now)
 const read=async(p:string,point?:string)=>{stats.modeledDocumentReads++;return point?store.snapshotGet!(p,point):store.get!(p)}
 const blocked=(reason:string)=>({status:'blocked' as const,reason,...stats,writes:0 as const})
 try{
  const metrics=await read('rankingState/metrics')
  if(metrics?.version!==1||metrics.ready!==true||typeof metrics.epoch!=='string'||!/^[a-f0-9]{32}$/.test(metrics.epoch))return blocked('ranking-metrics-not-ready')
  const current=await read('rankingState/current'),build=await read('rankingState/build'),lease=await read('rankingState/lease')
  if(build&&['scan','stage'].includes(String(build.phase)))return blocked('ranking-build-busy')
  if(lease&&timestamp(lease.expiresAt)>timestamp(now))return blocked('ranking-build-busy')
  if(current){
   if(current.version!==1||typeof current.generationId!=='string'||!/^[a-f0-9]{32}$/.test(current.generationId)||current.metricsEpoch!==metrics.epoch) return blocked('ranking-invalid-current')
   const age=timestamp(now)-timestamp(current.computedAt)
   if(age<0)return blocked('ranking-invalid-current')
   if(age<generationLimits.intervalMs)return {status:'not-due' as const,...stats,writes:0 as const}
  }
  const budget=await read('rankingBudgets/'+now.toISOString().slice(0,10))
  if(budget&&(budget.version!==1||['readsReserved','writesReserved','deletesReserved'].some(k=>!Number.isSafeInteger(budget[k])||Number(budget[k])<0)))return blocked('ranking-invalid-budget')
  if(Number(budget?.readsReserved??0)+segmentedRankingLimits.readReservation>generationLimits.dailyReads||Number(budget?.writesReserved??0)+segmentedRankingLimits.writeReservation>generationLimits.dailyWrites)return blocked('ranking-budget-exhausted')
  let after:string|undefined,point:string|undefined
  const games=new Map<string,RecordData|null>()
  for(;;){
   const page=await store.rankingSourcePage(after,point);stats.sourcePages++;stats.modeledDocumentReads+=Math.max(page.items.length,1)
   if(page.items.length>30||!Number.isFinite(Date.parse(page.readTime))||point&&point!==page.readTime||Date.parse(page.readTime)>timestamp(options.now())+1000)return blocked('ranking-invalid-source')
   if(!point){point=page.readTime;const at=await read('rankingState/metrics',point);if(at?.ready!==true||at.version!==1||at.epoch!==metrics.epoch)return blocked('ranking-metrics-changed')}
   for(const row of page.items){
    if(!/^[-_a-zA-Z0-9]{1,128}$/.test(row.id)||after!==undefined&&row.id<=after)return blocked('ranking-invalid-source')
    after=row.id;if(++stats.sourceDocuments>maximum)return blocked('ranking-source-limit')
    if(row.data.moderationStatus!=='published'){stats.unpublishedSkipped++;continue}
    const gameId=row.data.gameId;if(typeof gameId!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(gameId))return blocked('ranking-invalid-game')
    if(!games.has(gameId)){games.set(gameId,await read('games/'+gameId,point));stats.uniqueGamesRead++}
    const game=games.get(gameId)
    if(game?.status!=='active'){stats.inactiveGameSkipped++;continue}
    if(stats.eligibleVideos>=generationLimits.videos)return blocked('ranking-video-limit')
    if(row.data.likeCount===undefined)return blocked('ranking-preparation-required')
    const metric=await read('rankingMetrics/'+row.id,point)
    if(metric?.epoch!==metrics.epoch)return blocked('ranking-metrics-not-ready')
    rankingScore(row.data,game,metric,row.id,new Date(point));stats.eligibleVideos++
   }
   if(page.items.length<30)break
  }
  const finalMetrics=await read('rankingState/metrics')
  if(finalMetrics?.ready!==true||finalMetrics.version!==1||finalMetrics.epoch!==metrics.epoch)return blocked('ranking-metrics-changed')
  const scanSteps=Math.ceil(stats.sourceDocuments/segmentedRankingLimits.sourcePerStep)+(stats.sourceDocuments%30===0?1:0),stageSteps=Math.ceil(stats.eligibleVideos/segmentedRankingLimits.stagePerStep)
  return {status:'ready' as const,...stats,snapshotAt:point,estimatedBuildSteps:2+scanSteps+stageSteps,readReservation:segmentedRankingLimits.readReservation,writeReservation:segmentedRankingLimits.writeReservation,writes:0 as const}
 }catch(error){
  const known=new Set(['ranking-invalid-date','ranking-invalid-metrics','ranking-invalid-score','ranking-metrics-not-ready'])
  return blocked(error instanceof Error&&known.has(error.message)?error.message:'ranking-inspection-unavailable')
 }
}
