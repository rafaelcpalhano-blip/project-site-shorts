import type {AtomicStore} from '../firestore/atomic-store.ts'
import {planEmptyMetadata} from './database-plan.ts'
/** No default transport or HTTP route. Caller must keep all writers stopped.
 * Store and inspector must be bound to the SAME explicitly approved empty target.
 * No collection lock can certify emptiness while outside writers remain enabled.
 */
export async function initializeEmptyDatabase(options:{store:AtomicStore;inspect:()=>Promise<{rootCollectionIds:string[]}>;writersStopped:boolean;epoch:string;at:Date}){
 const plan=planEmptyMetadata(options.epoch,options.at)
 if(options.writersStopped!==true)throw Error('empty-database-writers-active')
 const inspection=await options.inspect()
 if(!inspection||!Array.isArray(inspection.rootCollectionIds)||inspection.rootCollectionIds.length)throw Error('empty-database-not-empty')
 return options.store.transact(async tx=>{
  // All reads precede all writes; an existing marker is never overwritten/reset.
  const prior=await Promise.all(plan.documents.map(doc=>tx.get(doc.path)))
  if(prior.some(Boolean))throw Error('empty-database-marker-exists')
  for(const doc of plan.documents)tx.create(doc.path,doc.data)
  return {created:plan.documents.map(doc=>doc.path),importedContent:false}
 })
}
