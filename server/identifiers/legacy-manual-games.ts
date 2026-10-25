import type {AtomicStore} from '../firestore/atomic-store.ts'
import {preparePublicIdentifier} from './public-identifiers.ts'

// Maintenance operation: no public route. Internal keys and all other fields stay intact.
export async function assignLegacyManualGameIdentifier(gameId:string,options:{store:AtomicStore;now:()=>Date}) {
 if(!/^[\w-]{1,128}$/.test(gameId))throw Error('invalid-game-id')
 return options.store.transact(async tx=>{
  const game=await tx.get('games/'+gameId)
  if(!game)throw Error('game-unavailable')
  if(game.source!=='manual')return {id:gameId,changed:false,publicId:null}
  if(gameId.startsWith('igdb-'))throw Error('invalid-manual-source')
  if(game.publicId!==undefined){
   if(typeof game.publicId!=='string'||!/^mn\d{4,16}$/.test(game.publicId))throw Error('invalid-existing-alias')
   const reservation=await tx.get('publicIdentifiers/'+game.publicId)
   if(reservation?.kind!=='manual-game'||reservation.internalId!==gameId)throw Error('identifier-reservation-conflict')
   return {id:gameId,changed:false,publicId:game.publicId}
  }
  const now=options.now()
  if(!Number.isSafeInteger(now.getTime())||now.getTime()<0)throw Error('invalid-clock')
  const alias=await preparePublicIdentifier(tx,'manual-game',gameId,now)
  alias.apply()
  tx.set('games/'+gameId,{...game,publicId:alias.publicId})
  tx.create('moderationLogs/'+crypto.randomUUID(),{contentType:'game',contentId:gameId,action:'assign-public-id',publicId:alias.publicId,reason:'Owner-authorized local legacy aliases',actor:'local-maintenance',createdAt:now})
  return {id:gameId,changed:true,publicId:alias.publicId}
 })
}
