import {preparePublicIdentifier} from '../identifiers/public-identifiers.ts'
import type {AtomicStore} from '../firestore/atomic-store.ts'
import {validateGameRequestInput} from '../../src/lib/validation/public-input.ts'
import {saoPauloDayKey} from '../../src/lib/validation/day-key.ts'
import {moderateText} from '../comments/moderate-text.ts'
import {nameIdentity,nameStatePath,readNameKeys,writeNameKeys,validateNameReference,GameNameError} from './name-keys.ts'
export function manualGameRecord(name:string,normalizedName:string,now:Date,provisional=false) {
 return {officialName:name,normalizedName,source:'manual',externalId:null,description:'',aliases:[],genres:[],gameModes:[],platforms:[],releaseDate:null,imageUrl:null,sourceUrl:null,status:'active',createdAt:now,reviewStatus:provisional?'provisional':'reviewed'}
}
export async function createManualGame(input:unknown,visitor:string,options:{store:AtomicStore;now:()=>Date}) {
 if(!/^[a-f0-9]{64}$/.test(visitor))throw new GameNameError('invalid-session',401)
 let data:ReturnType<typeof validateGameRequestInput>
 try{data=validateGameRequestInput(input)}catch{throw new GameNameError('invalid-input',400)}
 const identity=await nameIdentity(data.name)
 if(moderateText(data.name).status!=='approved')throw new GameNameError('game-name-not-allowed',422)
 return options.store.transact(async tx=>{
  const state=await tx.get(nameStatePath)
  if(state?.version!==1||state.ready!==true)throw new GameNameError('game-names-preparing',503)
  const records=await readNameKeys(tx,identity)
  const existing=[]
  for(const id of records.ids){const game=await tx.get('games/'+id);if(!game||game.status!=='active')throw new GameNameError('game-unavailable');validateNameReference(identity,records,id,game);existing.push({id,game})}
  if(existing.length){
   if(existing.length!==1||!records.exactIds.includes(existing[0].id))throw new GameNameError('game-name-conflict')
   const match=existing[0]
   if(typeof match.game.officialName!=='string')throw new Error('invalid-game-record')
   return {game:{id:match.id,name:match.game.officialName},created:false,repeated:true}
  }
  const previous=await tx.get('games/'+identity.manualId)
  if(previous)throw new GameNameError('game-names-preparing',503)
  const now=options.now()
  if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw new Error('invalid-clock')
  const path='gameCreationLimits/'+visitor+'-'+saoPauloDayKey(now),limit=await tx.get(path),count=limit?.count??0
  if(!Number.isSafeInteger(count)||Number(count)<0)throw new Error('invalid-game-quota')
  if(Number(count)>=3)throw new GameNameError('game-daily-limit',429)
  const alias=await preparePublicIdentifier(tx,'manual-game',identity.manualId,now)
  alias.apply()
  writeNameKeys(tx,identity,records,identity.manualId,now)
  tx.create('games/'+identity.manualId,{...manualGameRecord(data.name,identity.normalizedName,now,true),publicId:alias.publicId})
  tx.set(path,{count:Number(count)+1,dateKey:saoPauloDayKey(now),updatedAt:now})
  tx.create('moderationLogs/'+crypto.randomUUID(),{contentType:'game',contentId:identity.manualId,action:'create-provisional',actor:'automatic',visitorHash:visitor,createdAt:now})
  return {game:{id:identity.manualId,name:data.name},created:true,repeated:false}
 })
}
