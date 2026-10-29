import type {AtomicStore} from '../firestore/atomic-store.ts'
/** Public release uses stored like counts; composite ranking stays experimental.
 * Preserve existing data, transactions and all unrelated store operations. */
export function withoutCompositeRanking(store:AtomicStore):AtomicStore{
 const release:AtomicStore=Object.create(store)
 release.transact=work=>store.transact(tx=>work({...tx,experimentalRankingDisabled:true}))
 return release
}