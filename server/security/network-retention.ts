import type {AtomicStore} from '../firestore/atomic-store.ts'
/** Bounded maintenance; recheck expiry transactionally before deleting. No public endpoint. */
export async function cleanupNetworkAbuse(options:{store:AtomicStore;now:()=>Date}){
 const now=options.now();if(!Number.isSafeInteger(now.getTime())||!options.store.expiredNetworkRecords)throw Error('network-retention-unavailable')
 const rows=await options.store.expiredNetworkRecords(now)
 if(rows.length>30||rows.some(row=>!/^[a-f0-9]{64}$/.test(row.id)))throw Error('invalid-retention-page')
 let deleted=0
 for(const row of rows)deleted+=await options.store.transact(async tx=>{const path='networkAbuse/'+row.id,current=await tx.get(path);if(!current||!(current.expiresAt instanceof Date)||current.expiresAt>now)return 0;if(!tx.delete)throw Error('network-retention-unavailable');tx.delete(path);return 1})
 return {examined:rows.length,deleted,more:rows.length===30}
}
