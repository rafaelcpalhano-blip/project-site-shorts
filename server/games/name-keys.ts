import {readTransactionPair} from '../firestore/transaction-reads.ts'
import type { AtomicTransaction, RecordData } from '../firestore/atomic-store.ts'
import { normalizedGameName } from '../../src/lib/validation/game-name.ts'
export const nameStatePath='gameNameState/v1'
export class GameNameError extends Error { readonly status:number; constructor(code:string,status=409){super(code);this.status=status} }
export async function nameIdentity(name:unknown) {
 let identity:ReturnType<typeof normalizedGameName>
 try{identity=normalizedGameName(name)}catch{throw new GameNameError('invalid-game-name',400)}
 const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')
 return {...identity,exact:await hash('exact-v1:'+identity.normalizedName),similar:await hash('similar-v1:'+identity.skeleton),manualId:'manual-'+await hash(identity.normalizedName)}
}
export function keyIds(data:RecordData|null):string[] {
 if(!data)return []
 if(data.version!==1||!Array.isArray(data.gameIds)||data.gameIds.length<1||data.gameIds.length>10||data.gameIds.some(id=>typeof id!=='string'||!/^[\w-]{1,128}$/.test(id))||new Set(data.gameIds).size!==data.gameIds.length)throw new Error('invalid-name-key')
 return data.gameIds as string[]
}
export async function readNameKeys(tx:Pick<AtomicTransaction,'get'|'getMany'>,identity:Awaited<ReturnType<typeof nameIdentity>>) {
 const [exact,similar]=await readTransactionPair(tx,'gameNameKeys/'+identity.exact,'gameNameKeys/'+identity.similar)
 return {exact,similar,exactIds:keyIds(exact),ids:[...new Set([...keyIds(exact),...keyIds(similar)])]}
}
export function validateNameReference(identity:Awaited<ReturnType<typeof nameIdentity>>,records:Awaited<ReturnType<typeof readNameKeys>>,id:string,game:RecordData) {
 const names=[game.officialName,...(game.source==='manual'&&Array.isArray(game.reservedNames)?game.reservedNames:[])]
 if(names.length>21)throw new Error('invalid-name-reference')
 const actual=names.map(normalizedGameName)
 if(records.exactIds.includes(id)&&!actual.some(name=>name.normalizedName===identity.normalizedName)||keyIds(records.similar).includes(id)&&!actual.some(name=>name.skeleton===identity.skeleton))throw new Error('invalid-name-reference')
}
export function writeNameKeys(tx:AtomicTransaction,identity:Awaited<ReturnType<typeof nameIdentity>>,records:Awaited<ReturnType<typeof readNameKeys>>,id:string,now:Date) {
 for(const [key,previous]of [[identity.exact,records.exact],[identity.similar,records.similar]] as const){
  const ids=keyIds(previous);if(ids.includes(id))continue
  if(ids.length>=10)throw new GameNameError('game-name-conflict')
  const value={version:1,gameIds:[...ids,id].sort(),updatedAt:now}
  if(previous)tx.set('gameNameKeys/'+key,value);else tx.create('gameNameKeys/'+key,value)
 }
}
export async function prepareGameClaim(tx:AtomicTransaction,name:unknown,id:string,target:RecordData|null) {
 const state=await tx.get(nameStatePath)
 if(state&&(state.version!==1||state.ready!==true))throw new GameNameError('game-names-preparing',503)
 const identity=await nameIdentity(name),records=await readNameKeys(tx,identity)
 for(const otherId of records.ids){
  const other=otherId===id?target:await tx.get('games/'+otherId)
  if(!other||other.status!=='active')throw new GameNameError('game-unavailable')
  validateNameReference(identity,records,otherId,other)
  if(otherId===id)continue
  // Different official IDs remain distinct; never merge official games by their name.
  if(!id.startsWith('igdb-')||other.source!=='IGDB')throw new GameNameError('game-name-conflict')
 }
 return {identity,records}
}
