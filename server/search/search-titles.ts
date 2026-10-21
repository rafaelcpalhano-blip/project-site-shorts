import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import type { Short } from '../../src/features/shorts/types/models.ts'
import { normalizeTitle } from '../../src/lib/validation/title-search.ts'
import type { TitleSearchCursor } from '../../src/lib/validation/title-search.ts'
export type SearchCursor=TitleSearchCursor
export class SearchError extends Error {readonly status:number;constructor(code:string,status:number){super(code);this.status=status}}
const safeId=(value:unknown):value is string=>typeof value==='string'&&/^[\w-]{1,128}$/.test(value)
export function parseSearch(input:unknown) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['query','gameId','cursor'].includes(key)))throw new SearchError('invalid-input',400)
 const data=input as RecordData
 if(typeof data.query!=='string'||!data.query.trim()||data.query.length>500||[...data.query].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw new SearchError('invalid-input',400)
 const query=normalizeTitle(data.query)
 if(!query)throw new SearchError('invalid-input',400)
 if(data.gameId!==undefined&&data.gameId!==null&&!safeId(data.gameId))throw new SearchError('invalid-input',400)
 const gameId=typeof data.gameId==='string'?data.gameId:null
 let cursor:SearchCursor|undefined
 if(data.cursor!==undefined&&data.cursor!==null){
  const c=data.cursor as RecordData
  if(typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(key=>!['time','id','query','gameId','order'].includes(key))||
   typeof c.time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(c.time)||!Number.isFinite(Date.parse(c.time))||!safeId(c.id)||c.query!==query||c.gameId!==gameId||c.order!=='recent')throw new SearchError('invalid-cursor',400)
  cursor={time:c.time,id:c.id,query,gameId,order:'recent'}
 }
 return {query,gameId,cursor,fragment:[...query].slice(0,3).join('')}
}
function mapShort(id:string,data:RecordData):Short {
 if(!safeId(id)||!['YouTube','TikTok','Twitch'].includes(String(data.platform))||typeof data.platformVideoId!=='string'||typeof data.normalizedUrl!=='string'||!safeId(data.gameId)||!(data.createdAt instanceof Date)||!Number.isFinite(data.createdAt.getTime()))throw new Error('invalid-search-record')
 return {id,identity:data.platform+':'+data.platformVideoId,url:data.normalizedUrl,platform:String(data.platform),title:String(data.title),channelName:typeof data.channelName==='string'?data.channelName:'',gameId:data.gameId,createdAt:data.createdAt.getTime()}
}
export async function searchTitles(input:unknown,store:AtomicStore) {
 const data=parseSearch(input)
 if(!store.searchShorts)throw new Error('query-unavailable')
 const state=await store.transact(tx=>tx.get('searchState/title-v1'))
 if(state?.ready!==true)throw new SearchError('search-preparing',503)
 const items:Short[]=[];let examined=0,read=0,last:{time:string;id:string}|undefined,more=false
 // At most two queries of 15: never read a 31st candidate as a sentinel.
 for(let batch=0;batch<2;batch++){
  const rows=await store.searchShorts({fragment:data.fragment,gameId:data.gameId??undefined,cursor:last??data.cursor,limit:15})
  if(rows.length>15||read+rows.length>30)throw new Error('search-budget-exceeded')
  read+=rows.length;let consumed=0
  for(const row of rows){
   if(!safeId(row.id)||!(row.data.createdAt instanceof Date)||!Number.isFinite(row.data.createdAt.getTime()))throw new Error('invalid-search-record')
   const point={id:row.id,time:row.data.createdAt.toISOString()}
   const previous=last??data.cursor
   if(previous&&(point.time>previous.time||point.time===previous.time&&point.id>=previous.id))throw new Error('invalid-search-order')
   last=point;examined++;consumed++
   if(row.data.moderationStatus==='published'&&(!data.gameId||row.data.gameId===data.gameId)&&typeof row.data.title==='string'&&normalizeTitle(row.data.title).includes(data.query))items.push(mapShort(row.id,row.data))
   if(items.length===15)break
  }
  more=consumed<rows.length||rows.length===15
  if(items.length===15||!more)break
 }
 const next:SearchCursor|null=more&&last?{...last,query:data.query,gameId:data.gameId,order:'recent'}:null
 return {items,next,limited:examined===30,exhausted:!next,order:'recent' as const,candidatesRead:read,candidatesExamined:examined}
}
