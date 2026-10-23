import { manualGameCoverUrl } from '../../src/lib/validation/manual-game-details.ts'
import {loadAdminList} from '../admin/list-page.ts'
import type { AtomicStore, GameCatalogFilter, RecordData } from '../firestore/atomic-store.ts'
import { ReviewError, counter } from '../moderation/review-short.ts'
import { nameIdentity, readNameKeys, validateNameReference, writeNameKeys, nameStatePath } from './name-keys.ts'
const filters = ['all','active','provisional','hidden','banned'] as const
export type GameAction = 'approve' | 'hide' | 'ban' | 'unban' | 'restore'
const hidden = (status:unknown)=>['hidden','disabled','inactive'].includes(String(status))
function object(input:unknown,keys:string[]):RecordData {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))throw new ReviewError('invalid-input',400)
 return input as RecordData
}
function id(value:unknown):string {
 if(typeof value!=='string'||!/^[\w-]{1,128}$/.test(value))throw new ReviewError('invalid-input',400)
 return value
}
function time(value:unknown):string|null {return value instanceof Date&&Number.isFinite(value.getTime())?value.toISOString():null}
function item(gameId:string,game:RecordData){
 if(typeof game.officialName!=='string'||!['active','hidden','disabled','inactive','banned'].includes(String(game.status)))throw new Error('invalid-game-record')
 return {id:gameId,name:game.officialName,source:game.source==='IGDB'?'IGDB':'manual',status:String(game.status),provisional:game.reviewStatus==='provisional',createdAt:time(game.createdAt),revision:counter(game.reviewVersion??0)}
}
export async function loadGameCatalog(input:unknown,store:AtomicStore){
 const data=object(input,['filter','cursor','sort']),filter=data.filter as GameCatalogFilter
 if(!filters.includes(filter))throw new ReviewError('invalid-input',400)
 if(data.sort!==undefined){const result=await loadAdminList('games',filter,data.sort,data.cursor,store);return {items:result.rows.map(row=>item(row.id,row.data)),next:result.next}}
 let cursor:{time:string;id:string}|undefined
 if(data.cursor!==undefined){const c=object(data.cursor,['time','id','scope']);if(c.scope!==filter||typeof c.time!=='string'||!Number.isFinite(Date.parse(c.time)))throw new ReviewError('invalid-input',400);cursor={time:c.time,id:id(c.id)}}
 if(!store.gameCatalogPage)throw new Error('query-unavailable')
 const rows=await store.gameCatalogPage({filter,cursor,limit:21}),shown=rows.slice(0,20)
 const items=shown.map(row=>item(row.id,row.data)),last=items.at(-1)
 if(rows.length>20&&!last?.createdAt)throw new Error('invalid-game-date')
 return {items,next:rows.length>20?{time:last!.createdAt!,id:last!.id,scope:filter}:null}
}
function targets(game:RecordData,state:RecordData|null):GameAction[]{
 if(game.status==='active')return [...(game.reviewStatus==='provisional'?['approve' as const]:[]),'hide','ban']
 if(hidden(game.status))return ['restore','ban']
 if(game.status==='banned'&&state?.revision===counter(game.reviewVersion??0)&&(state.previousStatus==='active'||hidden(state.previousStatus)))return ['unban']
 return []
}
export async function loadCatalogGame(input:unknown,store:AtomicStore){
 const data=object(input,['id']),gameId=id(data.id)
 const snapshot=await store.transact(async tx=>({game:await tx.get('games/'+gameId),state:await tx.get('gameModerationStates/'+gameId)}))
 if(!snapshot.game)throw new ReviewError('game-unavailable',404)
 if(!store.query)throw new Error('query-unavailable')
 const logs=await store.query({collection:'moderationLogs',filter:{field:'contentId',value:gameId},orderBy:'createdAt',limit:21})
 let shortCount:number|null=null
 try{if(store.countGameShorts)shortCount=await store.countGameShorts(gameId)}catch{/* A failed aggregation must never become a fabricated zero. */}
 return {metadata:snapshot.game.source==='manual'?{name:snapshot.game.officialName,description:typeof snapshot.game.description==='string'?snapshot.game.description:'',imageUrl:manualGameCoverUrl(snapshot.game.imageUrl)??null,releaseDate:typeof snapshot.game.releaseDate==='string'?snapshot.game.releaseDate:null,...Object.fromEntries(['genres','gameModes','platforms','aliases'].map(key=>[key,Array.isArray(snapshot.game![key])?snapshot.game![key]:[]]))}:null,game:item(gameId,snapshot.game),actions:targets(snapshot.game,snapshot.state),shortCount,
  unbanTarget:targets(snapshot.game,snapshot.state).includes('unban')?String(snapshot.state!.previousStatus):null,
  history:logs.filter(row=>row.data.contentType==='game').slice(0,20).map(row=>({id:row.id,action:typeof row.data.action==='string'?row.data.action:'unknown',reason:typeof row.data.reason==='string'?row.data.reason:null,actorUid:typeof row.data.actorUid==='string'?row.data.actorUid:null,createdAt:time(row.data.createdAt)})),historyLimited:logs.length>20}
}
export async function moderateCatalogGame(input:unknown,uid:string,options:{store:AtomicStore;now:()=>Date}){
 const data=object(input,['id','action','reason','revision','confirmed']),gameId=id(data.id)
 if(!uid||uid.length>128)throw new Error('invalid-actor')
 if(data.confirmed!==true||!['approve','hide','ban','unban','restore'].includes(String(data.action))||typeof data.reason!=='string'||data.reason.trim().length<5||data.reason.trim().length>500||/\p{C}/u.test(data.reason)||!Number.isSafeInteger(data.revision)||Number(data.revision)<0||Number(data.revision)>=Number.MAX_SAFE_INTEGER)throw new ReviewError('invalid-input',400)
 const action=data.action as GameAction,reason=data.reason.trim(),now=options.now()
 return options.store.transact(async tx=>{
  const path='games/'+gameId,game=await tx.get(path),state=await tx.get('gameModerationStates/'+gameId)
  if(!game)throw new ReviewError('game-unavailable',404)
  const version=counter(game.reviewVersion??0)
  if(version!==data.revision)throw new ReviewError('stale-review')
  if(!targets(game,state).includes(action))throw new ReviewError('game-action-unavailable')
  const marker=await tx.get(nameStatePath)
  if(marker?.ready!==true||marker.version!==1)throw new ReviewError('game-names-preparing',503)
  const identity=await nameIdentity(game.officialName),records=await readNameKeys(tx,identity)
  // Reservations are retained for every state, never moved or merged into another game.
  for(const otherId of records.ids){const other=otherId===gameId?game:await tx.get('games/'+otherId);if(!other)throw new Error('invalid-name-reference');validateNameReference(identity,records,otherId,other)}
  const revision=version+1,next:RecordData={...game,reviewVersion:revision}
  if(action==='approve')next.reviewStatus='reviewed'
  if(action==='hide')next.status='hidden'
  if(action==='ban')next.status='banned'
  if(action==='restore')next.status='active'
  if(action==='unban')next.status=state!.previousStatus
  writeNameKeys(tx,identity,records,gameId,now)
  tx.set(path,next)
  tx.set('gameModerationStates/'+gameId,{revision,previousStatus:game.status,action,reason,actorUid:uid,updatedAt:now})
  tx.create('moderationLogs/'+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),{contentType:'game',contentId:gameId,action,reason,actorUid:uid,previousStatus:game.status,nextStatus:next.status,revision,createdAt:now})
  return {id:gameId,status:next.status,revision}
 })
}
