import type { AtomicStore } from '../firestore/atomic-store.ts'
import { titleSearchFields } from '../../src/lib/validation/title-search.ts'
export async function backfillTitlePage(store:AtomicStore,after?:string) {
 if(!store.scanShorts)throw new Error('scan-unavailable')
 const rows=await store.scanShorts(after)
 if(rows.length>30)throw new Error('backfill-budget-exceeded')
 let updated=0
 for(const {id} of rows){
  if(!/^[\w-]{1,128}$/.test(id))throw new Error('invalid-backfill-id')
  const changed=await store.transact(async tx=>{
   const current=await tx.get('shorts/'+id)
   if(!current)return false
   const fields=titleSearchFields(current.title as string)
   if(current.titleSearchVersion===fields.titleSearchVersion&&JSON.stringify(current.searchFragments)===JSON.stringify(fields.searchFragments))return false
   tx.set('shorts/'+id,{...current,...fields});return true
  })
  if(changed)updated++
 }
 return {examined:rows.length,updated,next:rows.length===30?rows.at(-1)!.id:null}
}
