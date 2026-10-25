import {parseVideoUrl} from '../../src/lib/validation/video-url.ts'
import type {AtomicStore} from '../firestore/atomic-store.ts'
import {ReviewError} from '../moderation/review-short.ts'
import {parseQuery} from '../moderation/queue.ts'
async function readKey(uid:string,id:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uid+':'+id))),b=>b.toString(16).padStart(2,'0')).join('')}
const integer=(value:unknown)=>{if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('invalid-update-counter');return Number(value)}
const iso=(value:unknown)=>value instanceof Date&&Number.isFinite(value.getTime())?value.toISOString():null
function eventId(value:unknown){if(typeof value!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(value))throw new ReviewError('invalid-input',400);return value}
export async function loadUpdates(input:unknown,uid:string,store:AtomicStore){
 const data=parseQuery(input,['category','cursor']),category=data.category??'all'
 if(!['all','published','reports','playback'].includes(String(category)))throw new ReviewError('invalid-input',400)
 let cursor:{time:string;id:string}|undefined
 if(data.cursor!==undefined&&data.cursor!==null){const c=parseQuery(data.cursor,['time','id','scope']);if(c.scope!==category||typeof c.time!=='string'||!Number.isFinite(Date.parse(c.time))||new Date(c.time).toISOString()!==c.time)throw new ReviewError('invalid-input',400);cursor={time:c.time,id:eventId(c.id)}}
 if(!store.query)throw Error('query-unavailable')
 const rows=await store.query({collection:'moderationLogs',filter:{field:category==='all'?'notificationChannel':'notificationKind',value:category==='all'?'updates':String(category)},orderBy:'createdAt',limit:21,cursor})
 const shown=rows.slice(0,20),keys=await Promise.all(shown.map(row=>readKey(uid,row.id)))
 const states=await store.transact(async tx=>Promise.all(shown.map(async(row,i)=>({read:await tx.get('adminUpdateReads/'+keys[i]),short:await tx.get('shorts/'+row.data.shortId),reports:row.data.notificationKind==='reports'?await tx.get('reportSummaries/'+row.data.shortId):null,playback:row.data.notificationKind==='playback'?await tx.get('playbackSummaries/'+row.data.shortId):null}))))
 const items=shown.map(({id,data:event},i)=>{if(event.notificationChannel!=='updates'||!['published','reports','playback'].includes(String(event.notificationKind))||typeof event.shortId!=='string'||!/^[a-f0-9]{64}$/.test(event.shortId)||!iso(event.createdAt))throw Error('invalid-update');const current=states[i].playback?.eventId===id?states[i].playback:null;let source:string|null=null;try{source=parseVideoUrl(String(states[i].short?.normalizedUrl)).url}catch{/* Invalid stored URLs are never linked. */}return {reportStatus:String(states[i].reports?.status??'unavailable'),action:String(event.action??''),strongCount:integer(current?.strongCount??event.strongCount??0),signals:Object.fromEntries(Object.entries(current?.signalCounts??event.signalCounts??{}).filter(([key,value])=>['manual','timeout','network','youtube-2','youtube-5','youtube-100','youtube-101','youtube-150','youtube-153','tiktok-error'].includes(key)&&Number.isSafeInteger(value)&&Number(value)>=0)),version:integer(event.eventVersion??1),source,id,category:String(event.notificationKind),shortId:event.shortId,title:typeof event.title==='string'?event.title:'Vídeo',platform:typeof event.platform==='string'?event.platform:'',gameName:typeof event.gameName==='string'?event.gameName:'',createdAt:iso(event.createdAt)!,reason:typeof event.reason==='string'?event.reason:typeof event.reasonCode==='string'?event.reasonCode:'',count:integer(current?.eligibleCount??event.eligibleCount??0),contextCount:integer(current?.contextCount??event.contextCount??0),status:String(states[i].short?.moderationStatus??'unavailable'),lastOccurrence:iso(current?.lastOccurrence)??iso(event.createdAt)!,read:states[i].read?.version===(event.eventVersion??1)}})
 const last=shown.at(-1)
 return {items,next:rows.length>20&&last?{time:iso(last.data.createdAt)!,id:last.id,scope:category}:null}
}
export async function markUpdateRead(input:unknown,uid:string,store:AtomicStore,now:()=>Date){
 const data=parseQuery(input,['id','version']),id=eventId(data.id),key=await readKey(uid,id)
 if(!Number.isSafeInteger(data.version)||Number(data.version)<1)throw new ReviewError('invalid-input',400)
 return store.transact(async tx=>{const event=await tx.get('moderationLogs/'+id);if(event?.notificationChannel!=='updates')throw new ReviewError('record-unavailable',404);if(Number(data.version)>Number(event.eventVersion??1))throw new ReviewError('invalid-input',400);const previous=await tx.get('adminUpdateReads/'+key);if(Number(previous?.version??0)<Number(data.version))tx.set('adminUpdateReads/'+key,{version:data.version,readAt:now()});return {id,read:true}})
}
