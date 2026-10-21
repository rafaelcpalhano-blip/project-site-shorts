import type {AtomicStore} from '../firestore/atomic-store.ts'
import {nameIdentity,nameStatePath,readNameKeys,writeNameKeys,keyIds} from './name-keys.ts'
export async function diagnoseGameNames(store:AtomicStore) {
 if(!store.scanGames)throw new Error('scan-unavailable')
 const claims=new Map<string,string>(),rows:Array<{id:string;name:string;status:unknown;source:unknown}>=[],collisions:Array<{id:string;otherId:string}>=[]
 let after:string|undefined
 while(true){
  const batch=await store.scanGames(after);if(batch.length>30)throw new Error('invalid-page')
  for(const row of batch){
   if(!/^[\w-]{1,128}$/.test(row.id)||(after&&row.id<=after))throw new Error('invalid-game-id')
   const identity=await nameIdentity(row.data.officialName)
   if(typeof row.data.status!=='string'||!['active','inactive','disabled','hidden','banned'].includes(row.data.status))throw new Error('invalid-game-status')
   for(const key of [identity.exact,identity.similar]){const previous=claims.get(key);if(previous&&previous!==row.id)collisions.push({id:row.id,otherId:previous});else claims.set(key,row.id)}
   rows.push({id:row.id,name:identity.name,status:row.data.status,source:row.data.source??null});after=row.id
  }
  if(batch.length<30)break
 }
 return {rows,collisions,keys:claims.size}
}
export async function prepareGameNames(store:AtomicStore,now:()=>Date=()=>new Date()) {
 const diagnosis=await diagnoseGameNames(store)
 if(diagnosis.collisions.length)throw new Error('name-collisions-no-changes')
 const runId=crypto.randomUUID()
 await store.transact(async tx=>{const state=await tx.get(nameStatePath),time=now();if(state?.ready===false&&state.leaseUntil instanceof Date&&state.leaseUntil>time)throw new Error('preparation-busy');tx.set(nameStatePath,{version:1,ready:false,runId,leaseUntil:new Date(time.getTime()+120000)})})
 let updated=0
 for(const row of diagnosis.rows){
  const identity=await nameIdentity(row.name)
  await store.transact(async tx=>{
   const state=await tx.get(nameStatePath),game=await tx.get('games/'+row.id),records=await readNameKeys(tx,identity)
   if(state?.runId!==runId||state.ready!==false||!(state.leaseUntil instanceof Date)||state.leaseUntil<now())throw new Error('preparation-lease-lost')
   if(!game||game.officialName!==row.name||game.status!==row.status||(game.source??null)!==row.source)throw new Error('catalog-changed')
   if([...keyIds(records.exact),...keyIds(records.similar)].some(id=>id!==row.id))throw new Error('reservation-conflict')
   writeNameKeys(tx,identity,records,row.id,now())
   tx.set(nameStatePath,{...state,leaseUntil:new Date(now().getTime()+120000)})
  });updated++
 }
 await store.transact(async tx=>{const state=await tx.get(nameStatePath);if(state?.runId!==runId||state.ready!==false)throw new Error('preparation-lease-lost');tx.set(nameStatePath,{version:1,ready:true,completedAt:now(),games:diagnosis.rows.length})})
 return {examined:diagnosis.rows.length,processed:updated,ready:true}
}
