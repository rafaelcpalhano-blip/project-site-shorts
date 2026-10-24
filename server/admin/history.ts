import type {AtomicStore} from '../firestore/atomic-store.ts'
import {parseQuery} from '../moderation/queue.ts'
import {ReviewError} from '../moderation/review-short.ts'
const collections={game:'games','game-request':'gameRequests',comment:'comments',short:'shorts'} as const
export async function loadAdminHistory(input:unknown,store:AtomicStore){
 const data=parseQuery(input,['kind','id','cursor'])
 if(typeof data.kind!=='string'||!Object.hasOwn(collections,data.kind)||typeof data.id!=='string'||!/^[\w-]{1,128}$/.test(data.id))throw new ReviewError('invalid-input',400)
 const kind=data.kind as keyof typeof collections
 if((kind==='short'||kind==='game-request')&&!/^[a-f0-9]{64}$/.test(data.id))throw new ReviewError('invalid-input',400)
 const scope=kind+':'+data.id
 let after:{time:string;id:string}|undefined
 if(data.cursor!==undefined&&data.cursor!==null){const c=parseQuery(data.cursor,['time','id','scope']);if(c.scope!==scope||typeof c.id!=='string'||! /^[\w-]{1,128}$/.test(c.id)||typeof c.time!=='string'||!Number.isFinite(Date.parse(c.time))||new Date(c.time).toISOString()!==c.time)throw new ReviewError('invalid-input',400);after={id:c.id,time:c.time}}
 const record=await store.transact(tx=>tx.get(collections[kind]+'/'+data.id))
 if(!record)throw new ReviewError('record-unavailable',404)
 if(!store.query)throw Error('query-unavailable')
 const rows=await store.query({collection:'moderationLogs',filter:{field:'contentId',value:data.id},orderBy:'createdAt',limit:21,cursor:after})
 const shown=rows.slice(0,20),last=shown.at(-1)
 const iso=(value:unknown)=>{if(!(value instanceof Date)||!Number.isFinite(value.getTime()))throw Error('invalid-date');return value.toISOString()}
 return {items:shown.filter(row=>row.data.contentType===kind).map(({id,data:event})=>({id,action:typeof event.action==='string'?event.action:'unknown',reason:typeof event.reason==='string'?event.reason:typeof event.reasonCode==='string'?event.reasonCode:'',actor:typeof event.actorUid==='string'?event.actorUid:typeof event.actor==='string'?event.actor:'Registro automático',createdAt:iso(event.createdAt),previousStatus:typeof event.previousStatus==='string'?event.previousStatus:null,nextStatus:typeof event.nextStatus==='string'?event.nextStatus:typeof event.resultingStatus==='string'?event.resultingStatus:null})),next:rows.length>20&&last?{time:iso(last.data.createdAt),id:last.id,scope}:null}
}
