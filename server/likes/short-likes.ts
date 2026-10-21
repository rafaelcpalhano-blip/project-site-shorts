import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import { isVisibleGame } from '../games/visibility.ts'
export class LikeError extends Error {
 readonly status:number
 constructor(code:string,status=400){super(code);this.status=status}
}
export function likeCount(value:unknown):number {
 if(value===undefined)return 0
 if(!Number.isSafeInteger(value)||Number(value)<0)throw new Error('invalid-like-count')
 return Number(value)
}
function parse(value:unknown,write:boolean){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new LikeError('invalid-input')
 const data=value as RecordData,allowed=write?['shortId','liked','revision']:['shortId']
 if(Object.keys(data).some(key=>!allowed.includes(key))||typeof data.shortId!=='string'||!/^[\w-]{1,128}$/.test(data.shortId)||write&&(typeof data.liked!=='boolean'||!Number.isSafeInteger(data.revision)||Number(data.revision)<0||Number(data.revision)>=Number.MAX_SAFE_INTEGER))throw new LikeError('invalid-input')
 return {shortId:data.shortId,liked:data.liked as boolean,revision:data.revision as number}
}
export async function likePath(shortId:string,visitor:string):Promise<string>{
 if(!/^[a-f0-9]{64}$/.test(visitor)||!/^[\w-]{1,128}$/.test(shortId))throw new LikeError('invalid-session',401)
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('short-like:v1:'+shortId+':'+visitor))
 return 'shortLikes/'+[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
}
export function likeRecord(record:RecordData|null,shortId:string){
 if(!record)return {liked:false,revision:0}
 if(record.shortId!==shortId||typeof record.liked!=='boolean'||!Number.isSafeInteger(record.revision)||Number(record.revision)<1||!(record.createdAt instanceof Date)||!Number.isFinite(record.createdAt.getTime())||!(record.changedAt instanceof Date)||!Number.isFinite(record.changedAt.getTime()))throw new Error('invalid-like-record')
 if(record.createdAt.getTime()>record.changedAt.getTime())throw new Error('invalid-like-record')
 return {liked:record.liked,revision:Number(record.revision)}
}
export async function shortLike(value:unknown,visitor:string,options:{store:AtomicStore;now:()=>Date},write=false){
 const input=parse(value,write),path=await likePath(input.shortId,visitor)
 return options.store.transact(async tx=>{
  const short=await tx.get('shorts/'+input.shortId)
  if(short?.moderationStatus!=='published'||typeof short.gameId!=='string'||!/^[\w-]{1,128}$/.test(short.gameId))throw new LikeError('short-unavailable',404)
  const game=await tx.get('games/'+short.gameId)
  if(!isVisibleGame(game))throw new LikeError('short-unavailable',404)
  const record=await tx.get(path),state=likeRecord(record,input.shortId),count=likeCount(short.likeCount)
  if(state.liked&&count===0)throw new Error('invalid-like-count')
  if(!write||state.liked===input.liked)return {shortId:input.shortId,...state,count}
  // An old request cannot undo a newer intent after a network retry or another tab.
  if(input.revision!==state.revision)throw new LikeError('stale-like',409)
  if(state.revision>=Number.MAX_SAFE_INTEGER||input.liked&&count>=Number.MAX_SAFE_INTEGER||!input.liked&&count===0)throw new Error('invalid-like-counter')
  const now=options.now()
  if(!Number.isFinite(now.getTime())||record&&now.getTime()<(record.changedAt as Date).getTime())throw new Error('invalid-like-clock')
  const nextCount=count+(input.liked?1:-1),revision=state.revision+1
  tx.set(path,{shortId:input.shortId,liked:input.liked,revision,createdAt:record?.createdAt??now,changedAt:now})
  tx.set('shorts/'+input.shortId,{...short,likeCount:nextCount})
  return {shortId:input.shortId,liked:input.liked,revision,count:nextCount}
 })
}
