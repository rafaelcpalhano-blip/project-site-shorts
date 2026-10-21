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
 const items:ReturnType<typeof publicShort>[]=[],games=new Map<string,Awaited<ReturnType<NonNullable<AtomicStore['get']>>>>()
 let read=0,examined=0,next:OrderedCursor|null=null
 while(read<30&&items.length<15){
  const page=await store.rankingPage({mode,gameId,generationId,readTime:point,cursor:cursor?{id:cursor.id,time:cursor.time,value:cursor.value}:undefined,limit:15});point=page.readTime
  if(page.items.length>15)throw Error('ranking-invalid-page')
  read+=page.items.length
  for(let index=0;index<page.items.length;index++){
   const row=page.items[index];examined++
   const anchor:OrderedCursor={scope,readTime:point,id:mode==='relevant'&&/^[-_a-zA-Z0-9]{1,192}$/.test(row.id)?row.id:id(row.id),time:new Date(timestamp(row.data.createdAt)).toISOString(),...(mode==='likes'?{value:likeCount(row.data.likeCount)}:mode==='relevant'?{value:Number(row.data.score),generationId,computedAt,metricsEpoch}: {})}
   if(mode==='relevant'&&(typeof row.data.score!=='number'||!Number.isFinite(anchor.value)||Number(anchor.value)<0))throw Error('ranking-invalid-score')
   cursor=anchor
   const shortId=mode==='relevant'?id(row.data.shortId):row.id,short=await store.get('shorts/'+shortId)
   if(short?.moderationStatus==='published'&&typeof short.gameId==='string'&&(!gameId||gameId===short.gameId)){
    const key=id(short.gameId)
    if(!games.has(key))games.set(key,await store.get('games/'+key))
    const game=games.get(key)
    if(game?.status==='active')items.push(publicShort(shortId,short,game))
   }
   if(items.length===15){next=index<page.items.length-1||page.items.length===15?anchor:null;break}
  }
  if(items.length===15)break
  if(page.items.length<15){next=null;break}
  next=cursor??null
 }
 return {items,next,order:mode,orderingAt:computedAt??point,limited:examined===30,candidatesRead:read,candidatesExamined:examined}
}
