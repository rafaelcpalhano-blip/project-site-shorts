import type {AtomicTransaction,RecordData} from './atomic-store.ts'
/** Read two independent documents in the same transaction. Never retry a failed
 * batch as independent reads or retain data across requests/transactions. */
export async function readTransactionPair(tx:Pick<AtomicTransaction,'get'|'getMany'>,first:string,second:string):Promise<[RecordData|null,RecordData|null]>{
 const rows=tx.getMany?await tx.getMany([first,second]):[await tx.get(first),await tx.get(second)]
 if(!Array.isArray(rows)||rows.length!==2||rows.some(row=>row!==null&&(!row||typeof row!=='object'||Array.isArray(row))))throw Error('invalid-transaction-read-pair')
 return [rows[0],rows[1]]
}
