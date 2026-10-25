import type {AtomicStore,AtomicTransaction,RecordData} from '../firestore/atomic-store.ts'
import {SubmissionError} from '../submissions/submit-short.ts'
import {saoPauloDayKey} from '../../src/lib/validation/day-key.ts'
import {networkAddress} from './network-address.ts'
export const networkLimits={sessionsPerWindow:8,sessionWindowMs:600000,sessionsPerDay:40,likeAttemptsPerMinute:60,submissionAttemptsPerMinute:20,publicationsPerDay:30,newLikesPerDay:200,newLikesPerVideoPerDay:20} as const
export type NetworkScope='playback-attempts'|'sessions'|'like-attempts'|'submission-attempts'|'contributions'
function integer(value:unknown){if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('invalid-network-record');return Number(value)}
function record(value:RecordData|null,scope:NetworkScope,day:string,now:Date){
 if(!value)return
 if(value.version!==1||value.scope!==scope||value.day!==day||!(value.expiresAt instanceof Date)||!Number.isFinite(value.expiresAt.getTime())||value.expiresAt<=now)throw Error('invalid-network-record')
}
export async function createNetworkProtection(options:{secret:string;store:AtomicStore;now:()=>Date}){
 if(!/^[a-f0-9]{64}$/i.test(options.secret))throw Error('invalid-network-secret')
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(options.secret.match(/../g)!,part=>parseInt(part,16)),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const budget=async(address:unknown,scope:NetworkScope)=>{
  const normalized=networkAddress(address),now=options.now()
  if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw Error('invalid-clock')
  const day=saoPauloDayKey(now),digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('clipzone-network:v1:'+scope+':'+day+':'+normalized))
  const id=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join(''),expiresAt=new Date(Date.parse(day+'T00:00:00Z')+4*86400000)
  return {path:'networkAbuse/'+id,now,day,scope,expiresAt}
 }
 const limited=()=>{throw new SubmissionError('abuse-limit')}
 async function attempt(address:unknown,scope:Exclude<NetworkScope,'contributions'>){
  const b=await budget(address,scope),windowMs=scope==='sessions'?networkLimits.sessionWindowMs:60000,maximum=scope==='sessions'?networkLimits.sessionsPerWindow:scope==='like-attempts'?networkLimits.likeAttemptsPerMinute:networkLimits.submissionAttemptsPerMinute
  await options.store.transact(async tx=>{
   const previous=await tx.get(b.path);record(previous,scope,b.day,b.now)
   let count=0,total=0,started=b.now
   if(previous){total=integer(previous.total);integer(previous.count);if(!(previous.startedAt instanceof Date)||!Number.isSafeInteger(previous.startedAt.getTime())||previous.startedAt>b.now)throw Error('invalid-network-record');if(b.now.getTime()-previous.startedAt.getTime()<windowMs){count=integer(previous.count);started=previous.startedAt}}
   if(total>=Number.MAX_SAFE_INTEGER)throw Error('invalid-network-record')
   if(count>=maximum||scope==='sessions'&&total>=networkLimits.sessionsPerDay)limited()
   tx.set(b.path,{version:1,scope,day:b.day,count:count+1,total:total+1,startedAt:started,expiresAt:b.expiresAt})
  })
 }
 async function prepareContribution(tx:AtomicTransaction,address:unknown,kind:'publication'|'like',shortId?:string){
  if(kind==='like'&&(typeof shortId!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(shortId)))throw Error('invalid-short')
  const b=await budget(address,'contributions'),previous=await tx.get(b.path);record(previous,b.scope,b.day,b.now)
  const publications=integer(previous?.publications??0),likes=integer(previous?.likes??0),videos=previous?.videoLikes??{}
  if(!videos||typeof videos!=='object'||Array.isArray(videos)||Object.keys(videos).length>networkLimits.newLikesPerDay||Object.entries(videos).some(([id,count])=>!/^[-_a-zA-Z0-9]{1,128}$/.test(id)||!Number.isSafeInteger(count)||Number(count)<1||Number(count)>networkLimits.newLikesPerVideoPerDay)||Object.values(videos).reduce((total,count)=>total+Number(count),0)!==likes)throw Error('invalid-network-record')
  if(publications>networkLimits.publicationsPerDay||likes>networkLimits.newLikesPerDay)throw Error('invalid-network-record')
  const videoLikes=videos as Record<string,number>,count=shortId&&Object.hasOwn(videoLikes,shortId)?videoLikes[shortId]:0
  if(kind==='publication'&&publications>=networkLimits.publicationsPerDay||kind==='like'&&(likes>=networkLimits.newLikesPerDay||count>=networkLimits.newLikesPerVideoPerDay))limited()
  const next={version:1,scope:b.scope,day:b.day,publications:publications+Number(kind==='publication'),likes:likes+Number(kind==='like'),videoLikes:kind==='like'?{...videoLikes,[shortId!]:count+1}:videoLikes,expiresAt:b.expiresAt}
  // Defer all writes until the caller has completed transaction reads (including ranking).
  return ()=>tx.set(b.path,next)
 }
 return {attempt,prepareContribution}
}
