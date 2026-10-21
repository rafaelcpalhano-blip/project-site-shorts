import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import {emptyRankingMetric,prepareEngagement} from './engagement.ts'
import {timestamp} from './metrics.ts'
import {likeCount,likeRecord} from '../likes/short-likes.ts'
export async function bootstrapRanking(options:{store:AtomicStore;now:()=>Date;apply?:boolean}){
 const {store}=options
 if(!store.rankingBootstrapPage)throw Error('ranking-store-unavailable')
 const data=new Map<string,Map<string,RecordData>>();let point:string|undefined,total=0
 for(const collection of ['shorts','games','shortLikes','comments','commentRequests'] as const){
  const docs=new Map<string,RecordData>();let after:string|undefined
  for(;;){const page=await store.rankingBootstrapPage(collection,after,point);point=page.readTime
   for(const row of page.items){if(!/^[-_a-zA-Z0-9]{1,128}$/.test(row.id)||++total>3000)throw Error('ranking-bootstrap-limit');docs.set(row.id,row.data)}
   if(page.items.length<30)break
   after=page.items.at(-1)!.id
  }
  data.set(collection,docs)
 }
 const at=new Date(point!),shorts=data.get('shorts')!,games=data.get('games')!,receipts=data.get('commentRequests')!,active=new Map<string,number>()
 if(shorts.size>300)throw Error('ranking-bootstrap-limit')
 const signals:Array<{shortId:string;gameId:string;kind:'like'|'comment';sourceId:string;identity?:string;at:Date;active:boolean}>=[]
 let unverified=0
 for(const [sourceId,record]of data.get('shortLikes')!){
  if(typeof record.shortId!=='string'||!shorts.has(record.shortId))throw Error('ranking-orphan-signal')
  likeRecord(record,record.shortId)
  if(!/^[a-f0-9]{64}$/.test(sourceId))throw Error('ranking-invalid-signal')
  if(record.liked)active.set(record.shortId,(active.get(record.shortId)??0)+1)
  signals.push({shortId:record.shortId,gameId:String(shorts.get(record.shortId)!.gameId),kind:'like',sourceId,identity:sourceId,at:record.createdAt as Date,active:record.liked===true})
 }
 for(const [sourceId,comment]of data.get('comments')!){
  if(!['approved','pending','rejected','removed'].includes(String(comment.moderationStatus)))throw Error('ranking-invalid-signal')
  if(!['approved','removed'].includes(String(comment.moderationStatus)))continue
  if(typeof comment.shortId!=='string'||!shorts.has(comment.shortId))throw Error('ranking-orphan-signal')
  const identity=receipts.get(sourceId)?.visitorHash,verified=typeof identity==='string'&&/^[a-f0-9]{64}$/.test(identity)
  if(!verified)unverified++
  signals.push({shortId:comment.shortId,gameId:String(shorts.get(comment.shortId)!.gameId),kind:'comment',sourceId,identity:verified?identity:undefined,at:comment.createdAt as Date,active:comment.moderationStatus==='approved'})
 }
 for(const [id,short]of shorts){
  if(typeof short.gameId!=='string'||!games.has(short.gameId))throw Error('ranking-invalid-game')
  const created=timestamp(short.createdAt),registered=timestamp(games.get(short.gameId)!.createdAt)
  if(registered>created||created>timestamp(at))throw Error('ranking-invalid-date')
  if(likeCount(short.likeCount)!==(active.get(id)??0))throw Error('ranking-like-count-mismatch')
 }
 for(const signal of signals)if(timestamp(signal.at)<timestamp(shorts.get(signal.shortId)!.createdAt)||timestamp(signal.at)>timestamp(at))throw Error('ranking-invalid-date')
 signals.sort((a,b)=>timestamp(a.at)-timestamp(b.at)||a.kind.localeCompare(b.kind)||a.sourceId.localeCompare(b.sourceId))
 const report={shorts:shorts.size,signals:signals.length,unverifiedComments:unverified,sourceDocuments:total,applied:!!options.apply}
 if(!options.apply)return report
 const epoch=crypto.randomUUID().replaceAll('-',''),started=options.now()
 await store.transact(async tx=>{
  const marker=await tx.get('rankingState/metrics')
  if(marker?.ready===true)throw Error('ranking-already-initialized')
  if(marker?.expiresAt instanceof Date&&marker.expiresAt.getTime()>started.getTime())throw Error('ranking-bootstrap-busy')
  tx.set('rankingState/metrics',{version:1,epoch,ready:false,startedAt:started,expiresAt:new Date(started.getTime()+300000)})
 })
 const renew=async()=>store.transact(async tx=>{const marker=await tx.get('rankingState/metrics');if(marker?.epoch!==epoch||marker.ready!==false)throw Error('ranking-bootstrap-conflict');tx.set('rankingState/metrics',{...marker,expiresAt:new Date(options.now().getTime()+300000)})})
 let processed=0
 for(const [id,short]of shorts){await store.transact(async tx=>{const marker=await tx.get('rankingState/metrics');if(marker?.epoch!==epoch||marker.ready!==false)throw Error('ranking-bootstrap-conflict');tx.set('rankingMetrics/'+id,emptyRankingMetric(id,String(short.gameId),at,epoch))});if(++processed%30===0)await renew()}
 processed=0
 for(const signal of signals){await store.transact(async tx=>{const apply=await prepareEngagement(tx,{...signal,now:at,bootstrapEpoch:epoch});apply()});if(++processed%30===0)await renew()}
 await store.transact(async tx=>{const marker=await tx.get('rankingState/metrics');if(marker?.epoch!==epoch||marker.ready!==false)throw Error('ranking-bootstrap-conflict');tx.set('rankingState/metrics',{version:1,epoch,ready:true,initializedAt:options.now(),snapshotAt:point!,shorts:shorts.size,signals:signals.length,unverifiedComments:unverified})})
 return report
}
