import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import { isVisibleGame } from '../games/visibility.ts'
import { publicId, publicCursor } from '../../src/lib/validation/public-read.ts'
import { parseQuery } from '../moderation/queue.ts'
import { parseVideoUrl } from '../../src/lib/validation/video-url.ts'
export class PublicReadError extends Error { readonly status: number; constructor(code: string, status = 400) { super(code); this.status=status } }
function input(value: unknown, keys: string[]) { try { return parseQuery(value,keys) } catch { throw new PublicReadError('invalid-input') } }
function id(value: unknown) { try { return publicId(value) } catch { throw new PublicReadError('invalid-input') } }
function cursor(value: unknown, scope: string) { try { return publicCursor(value,scope) } catch { throw new PublicReadError('invalid-input') } }
function date(data: RecordData) { if (!(data.createdAt instanceof Date) || !Number.isSafeInteger(data.createdAt.getTime()) || data.createdAt.getTime()<0) throw new Error('invalid-record'); return data.createdAt }
function text(data: RecordData, key: string, maximum: number) { const v=data[key]; if(typeof v!=='string'||!v.trim()||v.length>maximum)throw new Error('invalid-record');return v }
export function publicShort(id: string, data: RecordData, game: RecordData) {
  const url=text(data,'normalizedUrl',2048), parsed=parseVideoUrl(url)
  if(parsed.platform!==data.platform || parsed.identity!==data.platform+':'+data.platformVideoId)throw new Error('invalid-record')
  return {id,identity:parsed.identity,url,platform:parsed.platform,title:text(data,'title',500),channelName:typeof data.channelName==='string'?data.channelName:'',gameId:publicId(data.gameId),gameName:text(game,'officialName',500),createdAt:date(data).getTime()}
}
function reader(store: AtomicStore) { if(!store.get||!store.publicPage)throw new Error('public-read-unavailable');return {get:store.get,page:store.publicPage} }
export async function readFeed(value: unknown, store: AtomicStore) {
  const data=input(value,['gameId','cursor']),gameId=data.gameId===undefined?undefined:id(data.gameId),scope='shorts:'+(gameId??'*')
  let after=cursor(data.cursor,scope)
  const port=reader(store),games=new Map<string,RecordData|null>()
  const game=async(key:string)=>{if(!games.has(key))games.set(key,await port.get('games/'+key));return games.get(key)!}
  const items:ReturnType<typeof publicShort>[]=[],empty=()=>({items,next:null,limited:false,candidatesRead:0,candidatesExamined:0})
  if(gameId&&!isVisibleGame(await game(gameId)))return empty()
  let candidatesRead=0,candidatesExamined=0,next:typeof after|null=null
  while(candidatesRead<30&&items.length<15){
    const rows=await port.page({kind:'shorts',parentId:gameId,cursor:after,limit:15})
    if(rows.length>15)throw new Error('invalid-page')
    candidatesRead+=rows.length
    for(let index=0;index<rows.length;index++){
      const row=rows[index],current={id:publicId(row.id),time:date(row.data).toISOString(),scope}
      if(after&&(current.time>after.time||current.time===after.time&&current.id>=after.id))throw new Error('invalid-page-order')
      after=current;candidatesExamined++
      if(row.data.moderationStatus==='published'&&(!gameId||row.data.gameId===gameId)){
        const record=await game(publicId(row.data.gameId))
        if(isVisibleGame(record))items.push(publicShort(row.id,row.data,record!))
      }
      if(items.length===15){next=index<rows.length-1||rows.length===15?after:null;break}
    }
    if(items.length===15)break
    if(rows.length<15){next=null;break}
    next=after??null
  }
  return {items,next,limited:candidatesExamined===30,candidatesRead,candidatesExamined}
}
export async function readPublicShort(value: unknown, store: AtomicStore) {
  const data=input(value,['shortId']),shortId=id(data.shortId),port=reader(store),short=await port.get('shorts/'+shortId)
  if(short?.moderationStatus!=='published')throw new PublicReadError('short-unavailable',404)
  const game=await port.get('games/'+id(short.gameId))
  if(!isVisibleGame(game))throw new PublicReadError('short-unavailable',404)
  return publicShort(shortId,short,game!)
}
export async function readComments(value: unknown, store: AtomicStore) {
  const data=input(value,['shortId','cursor']),shortId=id(data.shortId),scope='comments:'+shortId,after=cursor(data.cursor,scope)
  await readPublicShort({shortId},store)
  const rows=await reader(store).page({kind:'comments',parentId:shortId,cursor:after,limit:21})
  if(rows.length>21)throw new Error('invalid-page')
  const items=rows.slice(0,20).map(row=>{if(row.data.shortId!==shortId||row.data.moderationStatus!=='approved')throw new Error('invalid-comment');return {id:publicId(row.id),content:text(row.data,'content',500),createdAt:date(row.data).getTime()}})
  const last=items.at(-1)
  return {items,next:rows.length>20&&last?{id:last.id,time:new Date(last.createdAt).toISOString(),scope}:null}
}
