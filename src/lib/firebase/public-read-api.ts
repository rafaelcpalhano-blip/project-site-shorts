import { PublicReadFailure, sessionReadFailure } from '../http/read-failure.ts'
import { validThumbnail } from '../validation/thumbnail.ts'
import type { Short } from '../../features/shorts/types/models.ts'
import { publicCursor, publicId } from '../validation/public-read.ts'
import type { PublicCursor } from '../validation/public-read.ts'
export type { PublicCursor }
export interface PublicShort extends Short { gameName: string; likeCount:number }
export interface PublicComment { id:string;content:string;createdAt:number;number?:number }
export interface ReadPage<T> { items:T[];next:PublicCursor|null;limited?:boolean;total?:number }
export function createPublicReadClient(fetcher:typeof fetch=fetch) {
 async function call(path:string,input:unknown,signal?:AbortSignal) {
  const deadline=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,deadline]):deadline
  const post=(url:string,body:unknown)=>{combined.throwIfAborted();return fetcher(url,{method:'POST',credentials:'same-origin',redirect:'error',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
  const session=await post('/api/session',{})
  if(!session.ok)throw sessionReadFailure(session.status)
  const response=await post(path,input)
  combined.throwIfAborted()
  if(!response.ok)throw new PublicReadFailure(response.status===404?'Conteúdo indisponível.':response.status===429?'Muitas consultas. Aguarde antes de tentar novamente.':'Não foi possível carregar o conteúdo.', response.status===404?'unavailable':response.status===401||response.status===403?'session':response.status===429?'rate-limit':'request')
  const data=await response.json()
  combined.throwIfAborted()
  return data
 }
 function checkShort(value:unknown):PublicShort {
  const row=value as PublicShort
  if(!row||typeof row!=='object'||typeof row.title!=='string'||typeof row.gameName!=='string'||!Number.isSafeInteger(row.likeCount)||row.likeCount<0||row.commentCount!==undefined&&(!Number.isSafeInteger(row.commentCount)||row.commentCount<0)||typeof row.url!=='string'||typeof row.channelName!=='string'||typeof row.identity!=='string'||!['YouTube','TikTok','Twitch'].includes(row.platform)||!Number.isSafeInteger(row.createdAt)||row.createdAt<0)throw new Error('Resposta inválida.')
  publicId(row.id);publicId(row.gameId);const {thumbnail,...rest}=row;const image=validThumbnail(thumbnail,row.platform,row.identity);return {...rest,...(image?{thumbnail:image}:{})}
 }
 return {
  async listShorts(gameId?:string,cursor?:PublicCursor,signal?:AbortSignal):Promise<ReadPage<PublicShort>> {
   if(gameId!==undefined)publicId(gameId)
   const scope='shorts:'+(gameId??'*');publicCursor(cursor,scope)
   const data=await call('/api/feed',{...(gameId?{gameId}:{}),...(cursor?{cursor}:{})},signal)
   if(!Array.isArray(data?.items)||data.items.length>15||typeof data.limited!=='boolean'||!Number.isSafeInteger(data.candidatesRead)||data.candidatesRead<0||data.candidatesRead>30||!Number.isSafeInteger(data.candidatesExamined)||data.candidatesExamined<0||data.candidatesExamined>data.candidatesRead||!Object.hasOwn(data,'next'))throw new Error('Resposta inválida.')
   const next=data.next===null?null:publicCursor(data.next,scope);if(next===undefined)throw new Error('Resposta inválida.')
   const items=data.items.map(checkShort);if(gameId&&items.some((row:PublicShort)=>row.gameId!==gameId))throw new Error('Resposta inválida.')
   return {items,next,limited:data.limited}
  },
  async listComments(shortId:string,cursor?:PublicCursor,signal?:AbortSignal):Promise<ReadPage<PublicComment>> {
   publicId(shortId);const scope='comments:'+shortId;publicCursor(cursor,scope)
   const data=await call('/api/comments/list',{shortId,...(cursor?{cursor}:{})},signal)
   if(data?.total!==undefined&&(!Number.isSafeInteger(data.total)||data.total<0))throw new Error('Resposta inválida.')
   if(!Array.isArray(data?.items)||data.items.length>20||!Object.hasOwn(data,'next'))throw new Error('Resposta inválida.')
   const items=data.items.map((row:PublicComment)=>{publicId(row?.id);if(typeof row.content!=='string'||row.content.length>500||!Number.isSafeInteger(row.createdAt)||row.createdAt<0||row.number!==undefined&&(!Number.isSafeInteger(row.number)||row.number<1))throw new Error('Resposta inválida.');return row})
   const next=data.next===null?null:publicCursor(data.next,scope);if(next===undefined)throw new Error('Resposta inválida.')
   return {items,next,...(data.total!==undefined?{total:data.total}:{})}
  },
  async getShort(shortId:string):Promise<PublicShort> { publicId(shortId);return checkShort(await call('/api/shorts/detail',{shortId})) },
 }
}
