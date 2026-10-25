import {mapGameDetails} from '../../src/features/games/services/game-details.ts'
import {publicId} from '../../src/lib/validation/public-read.ts'
import {parseQuery} from '../moderation/queue.ts'
import {PublicReadError} from './read-content.ts'
import type {AtomicStore,PublicGameCursor} from '../firestore/atomic-store.ts'
function input(value:unknown,keys:string[]){try{return parseQuery(value,keys)}catch{throw new PublicReadError('invalid-input')}}
export function gameCatalogCursor(value:unknown):PublicGameCursor|undefined{
 if(value===undefined)return undefined
 const row=input(value,['id','name'])
 try{publicId(row.id)}catch{throw new PublicReadError('invalid-input')}
 if(typeof row.name!=='string'||!row.name.trim()||row.name.length>500)throw new PublicReadError('invalid-input')
 return {id:row.id as string,name:row.name}
}
export async function readGames(value:unknown,store:AtomicStore){
 const data=input(value,['cursor']),cursor=gameCatalogCursor(data.cursor)
 if(!store.publicGamesPage)throw Error('public-catalog-unavailable')
 const rows=await store.publicGamesPage(cursor)
 if(rows.length>51)throw Error('invalid-page')
 const items=rows.slice(0,50).map(row=>{
  if(row.data.status!=='active'||typeof row.data.officialName!=='string'||!row.data.officialName.trim()||row.data.officialName.length>500)throw Error('invalid-game')
  return {id:publicId(row.id),name:row.data.officialName}
 })
 const last=items.at(-1)
 return {items,next:rows.length>50&&last?{id:last.id,name:last.name}:null}
}
export async function readGame(value:unknown,store:AtomicStore){
 const data=input(value,['gameId']);let id:string
 try{id=publicId(data.gameId)}catch{throw new PublicReadError('invalid-input')}
 if(!store.get)throw Error('public-catalog-unavailable')
 const game=await store.get('games/'+id)
 if(!game||game.status!=='active')throw new PublicReadError('game-unavailable',404)
 return mapGameDetails(id,game)
}
