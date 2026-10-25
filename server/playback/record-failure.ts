import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import type {SubmissionDependencies} from '../submissions/submit-short.ts'
import {shortGameVisible} from '../games/visibility.ts'
import {validateSubmissionInput} from '../../src/lib/validation/public-input.ts'
import {updateFields} from '../admin/update-event.ts'
export const playbackWindowMs=30*24*60*60*1000
export const playbackThreshold=15
const signals=['manual','timeout','network','youtube-2','youtube-5','youtube-100','youtube-101','youtube-150','youtube-153','tiktok-error','autoplay'] as const
export class PlaybackFailureError extends Error {readonly status:number;constructor(code:string,status=400){super(code);this.status=status}}
const count=(v:unknown)=>{if(!Number.isSafeInteger(v)||Number(v)<0||Number(v)>=Number.MAX_SAFE_INTEGER)throw Error('invalid-playback-counter');return Number(v)}
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
export async function recordPlaybackFailure(input:unknown,visitor:string,options:{store:AtomicStore;now:()=>Date;verify:SubmissionDependencies['verify']}){
 if(!/^[a-f0-9]{64}$/.test(visitor))throw new PlaybackFailureError('invalid-session',401)
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['shortId','signal'].includes(key)))throw new PlaybackFailureError('invalid-input')
 const data=input as RecordData
 if(typeof data.shortId!=='string'||!/^[a-f0-9]{64}$/.test(data.shortId)||!signals.includes(data.signal as typeof signals[number]))throw new PlaybackFailureError('invalid-input')
 const shortId=data.shortId,signal=String(data.signal)
 if(signal==='autoplay')return {received:false,counted:false,review:false,hidden:false}
 const now=options.now();if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw Error('invalid-clock')
 const outcome=await options.store.transact(async tx=>{
  const short=await tx.get('shorts/'+shortId)
  if(short?.moderationStatus!=='published'||!await shortGameVisible(short,tx))throw new PlaybackFailureError('short-unavailable',404)
  if(signal.startsWith('youtube-')&&short.platform!=='YouTube'||signal==='tiktok-error'&&short.platform!=='TikTok')throw new PlaybackFailureError('invalid-signal')
  const path='playbackSummaries/'+shortId,previous=await tx.get(path),revision=count(short.reviewVersion??0)
  if(previous?.startedAt instanceof Date&&previous.startedAt>now)throw Error('clock-moved-backwards')
  const valid=previous&&previous.revision===revision&&previous.startedAt instanceof Date&&previous.startedAt.getTime()<=now.getTime()&&now.getTime()-previous.startedAt.getTime()<playbackWindowMs
  const summary:RecordData=valid?{...previous}:{revision,cycle:crypto.randomUUID(),startedAt:now,eligibleCount:0,strongCount:0,contextCount:0,lastOccurrence:now,forwarded:false}
  if(typeof summary.cycle!=='string')throw Error('invalid-cycle')
  const receiptId=await hash(shortId+':'+summary.cycle+':'+visitor),receipt=await tx.get('playbackReceipts/'+receiptId)
  const eligible=signal==='manual'||['youtube-100','youtube-101','youtube-150','tiktok-error'].includes(signal)
  const strong=['youtube-100','youtube-101','youtube-150'].includes(signal)
  if(eligible?receipt?.eligible===true:receipt?.context===true)return {duplicate:true,summary,short,verify:false}
  const eligibleCount=count(summary.eligibleCount)+(eligible?1:0),strongCount=count(summary.strongCount)+(strong?1:0),contextCount=count(summary.contextCount)+(eligible?0:1)
  const eventId=await hash('playback-event:'+shortId+':'+summary.cycle)
  const shouldVerify=strongCount>=playbackThreshold&&(!(summary.lastVerificationAt instanceof Date)||now.getTime()-summary.lastVerificationAt.getTime()>=600000)
  const previousSignals=summary.signalCounts&&typeof summary.signalCounts==='object'&&!Array.isArray(summary.signalCounts)?summary.signalCounts as RecordData:{}
  const signalCounts={...previousSignals,[signal]:count(previousSignals[signal]??0)+1}
  const next:RecordData={...summary,signalCounts,eligibleCount,strongCount,contextCount,lastOccurrence:now,eventId,...(shouldVerify?{lastVerificationAt:now}:{})}
  tx.set('playbackReceipts/'+receiptId,{...receipt,eligible:eligible||receipt?.eligible===true,context:!eligible||receipt?.context===true,signal,createdAt:receipt?.createdAt??now})
  if(eligibleCount>=playbackThreshold&&!summary.forwarded){tx.create('moderationLogs/'+eventId,{...updateFields('playback',{shortId,title:short.title,platform:short.platform}),contentType:'short',contentId:shortId,action:'playback-review',reason:'recurring-playback-failure',eligibleCount,strongCount,signalCounts,windowMs:playbackWindowMs,cycle:summary.cycle,createdAt:now,actor:'automatic',eventVersion:1});next.forwarded=true}
  tx.set(path,next)
  return {duplicate:false,summary:next,short,verify:shouldVerify}
 })
 if(outcome.duplicate||!outcome.verify)return {received:true,counted:!outcome.duplicate,review:outcome.summary.forwarded===true,hidden:false}
 // Browser claims cannot hide content. Require a current negative provider verdict on the server.
 let confirmed=false
 try{const evidence=await options.verify(validateSubmissionInput({url:outcome.short.normalizedUrl,gameId:outcome.short.gameId,title:outcome.short.title,channelName:outcome.short.channelName}));confirmed=evidence.existence==='missing'||evidence.embedding==='blocked'}catch{/* Unknown/network/key failures never become proof. */}
 if(!confirmed)return {received:true,counted:true,review:true,hidden:false}
 const hidden=await options.store.transact(async tx=>{
  const short=await tx.get('shorts/'+shortId),summary=await tx.get('playbackSummaries/'+shortId),event=await tx.get('moderationLogs/'+outcome.summary.eventId)
  if(short?.moderationStatus!=='published'||summary?.cycle!==outcome.summary.cycle||short.reviewVersion!==outcome.short.reviewVersion||short.normalizedUrl!==outcome.short.normalizedUrl||count(summary?.strongCount??0)<playbackThreshold||!summary||summary.hidden===true)return false
  const revision=count(short.reviewVersion??0)
  tx.set('shorts/'+shortId,{...short,moderationStatus:'pending',reviewVersion:revision+1,administrativeBlock:{previousStatus:'published',blockedAt:now}})
  tx.set('playbackSummaries/'+shortId,{...summary,hidden:true,confirmedAt:now,reason:'provider-confirmed-unavailable'})
  tx.set('moderationLogs/'+outcome.summary.eventId,{...event,action:'playback-block',reason:'provider-confirmed-unavailable',resultingStatus:'pending',previousStatus:'published',eligibleCount:summary.eligibleCount,strongCount:summary.strongCount,signalCounts:summary.signalCounts,contextCount:summary.contextCount,eventVersion:2})
  return true
 })
 return {received:true,counted:true,review:true,hidden}
}
