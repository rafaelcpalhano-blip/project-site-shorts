import { prepareGameClaim, writeNameKeys } from './name-keys.ts'
import { manualGameRecord } from './manual-game.ts'
import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import { validateGameRequestInput } from '../../src/lib/validation/public-input.ts'
import { parseQuery, cursor, shortId } from '../moderation/queue.ts'
import { ReviewError } from '../moderation/review-short.ts'
const statuses = ['pending','linked','rejected']
function map(id:string, data:RecordData) {
  if (!statuses.includes(String(data.status)) || typeof data.name !== 'string' || !(data.createdAt instanceof Date) || !Number.isFinite(data.createdAt.getTime()) || !Number.isSafeInteger(data.revision) || Number(data.revision)<0) throw new Error('invalid-request-record')
  return {id,name:data.name,status:String(data.status),createdAt:data.createdAt.toISOString(),revision:Number(data.revision),
    gameId:typeof data.gameId==='string'?data.gameId:null,reason:typeof data.reason==='string'?data.reason:''}
}
export async function requestGame(input:unknown, visitor:string, options:{store:AtomicStore;now:()=>Date}) {
  if (!/^[a-f0-9]{64}$/.test(visitor)) throw new ReviewError('invalid-session',401)
  let data:ReturnType<typeof validateGameRequestInput>
  try {data=validateGameRequestInput(input)} catch {throw new ReviewError('invalid-input',400)}
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([visitor,data.normalizedName])))
  const id=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')
  return options.store.transact(async tx=>{
    const previous=await tx.get('gameRequests/'+id)
    if(previous && (previous.visitorHash!==visitor || previous.normalizedName!==data.normalizedName)) throw new Error('invalid-request-owner')
    const now=options.now()
    if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw new Error('invalid-clock')
    const record=previous??{...data,visitorHash:visitor,status:'pending',revision:0,createdAt:now}
    const mapped=map(id,record)
    const game=mapped.status==='linked' && mapped.gameId ? await tx.get('games/'+mapped.gameId):null
    if(!previous)tx.create('gameRequests/'+id,record)
    return {id,status:mapped.status,repeated:!!previous,game:game?.status==='active' && typeof game.officialName==='string'?{id:mapped.gameId,name:game.officialName}:null}
  })
}
export async function loadGameRequests(input:unknown,store:AtomicStore) {
  const data=parseQuery(input,['status','cursor'])
  if(!statuses.includes(String(data.status)))throw new ReviewError('invalid-input',400)
  if(!store.query)throw new Error('query-unavailable')
  const rows=await store.query({collection:'gameRequests',filter:{field:'status',value:String(data.status)},orderBy:'createdAt',limit:21,cursor:cursor(data.cursor)})
  const items=rows.slice(0,20).map(row=>map(row.id,row.data)),last=items.at(-1)
  return {items,next:rows.length>20&&last?{id:last.id,time:last.createdAt}:null}
}
export async function reviewGameRequest(input:unknown,actorUid:string,options:{store:AtomicStore;now:()=>Date}) {
  const data=parseQuery(input,['id','action','gameId','name','reason','revision'])
  const id=shortId(data.id)
  if(!['link','create','reject'].includes(String(data.action)) || typeof data.reason!=='string'||data.reason.trim().length<5||data.reason.length>500||[...data.reason].some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127)||!Number.isSafeInteger(data.revision)||Number(data.revision)<0)throw new ReviewError('invalid-input',400)
  if(data.action==='link' && (typeof data.gameId!=='string'||!/^igdb-[1-9]\d{0,9}$/.test(data.gameId)||data.name!==undefined))throw new ReviewError('invalid-input',400)
  if(data.action!=='link' && data.gameId!==undefined || data.action!=='create' && data.name!==undefined)throw new ReviewError('invalid-input',400)
  let manual:ReturnType<typeof validateGameRequestInput>|undefined
  let targetId=data.action==='link'?String(data.gameId):null
  if(data.action==='create'){
    try{manual=validateGameRequestInput({name:data.name})}catch{throw new ReviewError('invalid-input',400)}
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(manual.normalizedName))
    targetId='manual-'+Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')
  }
  const reason=data.reason.trim()
  return options.store.transact(async tx=>{
    const record=await tx.get('gameRequests/'+id)
    if(!record)throw new ReviewError('request-unavailable',404)
    const current=map(id,record)
    if(current.status!=='pending'||current.revision!==data.revision)throw new ReviewError('stale-review',409)
    const game=targetId?await tx.get('games/'+targetId):null
    if(data.action==='link' && (!game||game.status!=='active'||game.source!=='IGDB'||game.externalId!==String(data.gameId).slice(5)))throw new ReviewError('invalid-game',409)
    if(manual&&game&&(game.status!=='active'||game.source!=='manual'||game.normalizedName!==manual.normalizedName))throw new ReviewError('invalid-game',409)
    const claim=targetId?await prepareGameClaim(tx,game?.officialName??manual?.name,targetId,game):null
    const now=options.now()
    if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw new Error('invalid-clock')
    if(claim&&targetId)writeNameKeys(tx,claim.identity,claim.records,targetId,now)
    if(manual&&!game)tx.create('games/'+targetId,manualGameRecord(manual.name,manual.normalizedName,now))
    const status=data.action==='reject'?'rejected':'linked'
    tx.set('gameRequests/'+id,{...record,status,revision:current.revision+1,reason,updatedAt:now,...(targetId?{gameId:targetId}:{})})
    tx.create('moderationLogs/'+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),{
      contentId:id,contentType:'game-request',action:data.action,actorUid,reason,previousStatus:current.status,nextStatus:status,createdAt:now,...(targetId?{gameId:targetId,gameSource:manual?'manual':'IGDB'}:{})})
    return {id,status}
  })
}
