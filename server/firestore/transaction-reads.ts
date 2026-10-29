import type {AtomicTransaction,RecordData} from './atomic-store.ts'
/** Read two independent documents in the same transaction. Never retry a failed
 * batch as independent reads or retain data across requests/transactions. */
export async function readTransactionPair(tx:Pick<AtomicTransaction,'get'|'getMany'>,first:string,second:string):Promise<[RecordData|null,RecordData|null]>{
 const rows=tx.getMany?await tx.getMany([first,second]):[await tx.get(first),await tx.get(second)]
 if(!Array.isArray(rows)||rows.length!==2||rows.some(row=>row!==null&&(!row||typeof row!=='object'||Array.isArray(row))))throw Error('invalid-transaction-read-pair')
 return [rows[0],rows[1]]
}


/** Bounded independent reads within the SAME transaction. A rejected or malformed
 * batch never falls back to new independent/current-state reads. */
export async function readTransactionGroup(tx:Pick<AtomicTransaction,'get'|'getMany'>,paths:string[]):Promise<Array<RecordData|null>>{
 if(!Array.isArray(paths)||paths.length<1||paths.length>4||new Set(paths).size!==paths.length)throw Error('invalid-transaction-read-group')
 let rows:Array<RecordData|null>
 if(tx.getMany)rows=await tx.getMany(paths);else{rows=[];for(const path of paths)rows.push(await tx.get(path))}
 if(!Array.isArray(rows)||rows.length!==paths.length||rows.some(row=>row!==null&&(!row||typeof row!=='object'||Array.isArray(row))))throw Error('invalid-transaction-read-group')
 return rows
}
