import type {AtomicStore,RankingQuery} from '../firestore/atomic-store.ts'
import {publicShort} from '../public/read-content.ts'
import {timestamp} from './metrics.ts'
import {likeCount} from '../likes/short-likes.ts'
export interface OrderedCursor {scope:string;readTime:string;id:string;time:string;value?:number;generationId?:string;computedAt?:string;metricsEpoch?:string}
const id=(value:unknown)=>{if(typeof value!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(value))throw Error('ranking-invalid-input');return value}
export async function readOrderedFeed(input:{order?:RankingQuery['mode'];gameId?:string;cursor?:OrderedCursor},options:{store:AtomicStore;now:()=>Date}){
 const {store}=options,mode=input.order??'latest',gameId=input.gameId===undefined?undefined:id(input.gameId),scope=mode+':'+(gameId??'*'),now=timestamp(options.now())
 if(!['latest','oldest','likes','relevant'].includes(mode)||Object.keys(input).some(key=>!['order','gameId','cursor'].includes(key))||!store.get||!store.rankingPage)throw Error('ranking-invalid-input')
 let cursor=input.cursor,point=cursor?.readTime,generationId=cursor?.generationId,computedAt=cursor?.computedAt,metricsEpoch=cursor?.metricsEpoch
 if(cursor&&mode==='relevant')throw Error('ranking-cursor-expired-or-mismatched')
 if(cursor){
  if(cursor.scope!==scope||!Number.isFinite(Date.parse(cursor.readTime))||now-Date.parse(cursor.readTime)>=1800000||Date.parse(cursor.readTime)>now+1000||!Number.isFinite(Date.parse(cursor.time)))throw Error('ranking-cursor-expired-or-mismatched')
  if(mode==='relevant'){if(typeof cursor.id!=='string'||!/^[-_a-zA-Z0-9]{1,192}$/.test(cursor.id))throw Error('ranking-invalid-input')}else id(cursor.id)
  if(['likes','relevant'].includes(mode)&&(!Number.isFinite(cursor.value)||Number(cursor.value)<0))throw Error('ranking-invalid-input')
  if(mode==='relevant'&&(!/^[a-f0-9]{32}$/.test(generationId??'')||typeof computedAt!=='string'||!Number.isFinite(Date.parse(computedAt))))throw Error('ranking-invalid-input')
 }else if(mode==='relevant'){
  const current=await store.get('rankingState/current')
  if(current?.version!==1||typeof current.generationId!=='string'||!/^[a-f0-9]{32}$/.test(current.generationId)||now-timestamp(current.computedAt)>5400000||timestamp(current.computedAt)>now)throw Error('ranking-not-ready-or-stale')
  const metrics=await store.get('rankingState/metrics')
  if(metrics&&(metrics.ready!==true||current.metricsEpoch!==metrics.epoch))throw Error('ranking-not-ready-or-stale')
  metricsEpoch=typeof current.metricsEpoch==='string'?current.metricsEpoch:undefined
  generationId=current.generationId;computedAt=(current.computedAt as Date).toISOString()
 }
 if(mode==='relevant'&&cursor){const metrics=await store.get('rankingState/metrics');if(metrics&&(metrics.ready!==true||metrics.epoch!==metricsEpoch))throw Error('ranking-not-ready-or-stale')}
 const items:ReturnType<typeof publicShort>[]=[],games=new Map<string,Promise<Awaited<ReturnType<NonNullable<AtomicStore['get']>>>>>()
 const game=(key:string)=>{
  let pending=games.get(key)
  if(!pending){pending=store.get!('games/'+key);games.set(key,pending)}
  return pending
 }
 let read=0,examined=0,next:OrderedCursor|null=null
 while(read<30&&items.length<15){
  const page=await store.rankingPage({mode,gameId,generationId,readTime:point,cursor:cursor?{id:cursor.id,time:cursor.time,value:cursor.value}:undefined,limit:15});point=page.readTime
  if(page.items.length>15)throw Error('ranking-invalid-page')
  read+=page.items.length
  // Resolve a small window concurrently, then consume it in cursor order.
  // Never prefetch more candidates than the remaining visible slots.
  for(let start=0;start<page.items.length&&items.length<15;){
   const end=Math.min(page.items.length,start+4,start+15-items.length)
   const rows=page.items.slice(start,end)
   let shorts:Awaited<ReturnType<NonNullable<AtomicStore['getMany']>>>|undefined
   if(store.getMany){
    const paths=rows.map(row=>'shorts/'+id(mode==='relevant'?row.data.shortId:row.id)),unique=[...new Set(paths)]
    const loaded=await store.getMany(unique)
    if(loaded.length!==unique.length)throw Error('ranking-invalid-batch')
    const byPath=new Map(unique.map((path,index)=>[path,loaded[index]]))
    shorts=paths.map(path=>byPath.get(path)!)
    const fresh=[...new Set(shorts.filter(short=>short?.moderationStatus==='published'&&typeof short.gameId==='string'&&(!gameId||gameId===short.gameId)).map(short=>id(short!.gameId)))].filter(key=>!games.has(key))
    if(fresh.length){
     const records=await store.getMany(fresh.map(key=>'games/'+key))
     if(records.length!==fresh.length)throw Error('ranking-invalid-batch')
     fresh.forEach((key,index)=>games.set(key,Promise.resolve(records[index])))
    }
   }
   const window=await Promise.all(rows.map(async (row,index)=>{
    const anchor:OrderedCursor={scope,readTime:point!,id:mode==='relevant'&&/^[-_a-zA-Z0-9]{1,192}$/.test(row.id)?row.id:id(row.id),time:new Date(timestamp(row.data.createdAt)).toISOString(),...(mode==='likes'?{value:likeCount(row.data.likeCount)}:mode==='relevant'?{value:Number(row.data.score),generationId,computedAt,metricsEpoch}: {})}
    if(mode==='relevant'&&(typeof row.data.score!=='number'||!Number.isFinite(anchor.value)||Number(anchor.value)<0))throw Error('ranking-invalid-score')
    const shortId=mode==='relevant'?id(row.data.shortId):row.id,short=shorts?shorts[index]:await store.get!('shorts/'+shortId)
    let item:ReturnType<typeof publicShort>|undefined
    if(short?.moderationStatus==='published'&&typeof short.gameId==='string'&&(!gameId||gameId===short.gameId)){
     const record=await game(id(short.gameId))
     if(record?.status==='active')item=publicShort(shortId,short,record)
    }
    return {anchor,item}
   }))
   for(let offset=0;offset<window.length;offset++){
    const {anchor,item}=window[offset],index=start+offset
    cursor=anchor;examined++
    if(item)items.push(item)
    if(items.length===15){next=index<page.items.length-1||page.items.length===15?anchor:null;break}
   }
   start=end
  }
  if(mode==='relevant'){next=null;break}
  if(items.length===15)break
  if(page.items.length<15){next=null;break}
  next=cursor??null
 }
 return {items,next,order:mode,orderingAt:computedAt??point,limited:examined===30,candidatesRead:read,candidatesExamined:examined}
}
