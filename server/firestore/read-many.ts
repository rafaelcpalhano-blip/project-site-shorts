import type {AtomicTransaction,RecordData} from './atomic-store.ts'
/** Preserve one transaction snapshot while sharing repeated document identities. */
export async function readTransactionRecords(tx:AtomicTransaction,paths:string[]){
 const unique=[...new Set(paths)],records=new Map<string,RecordData|null>()
 if(unique.length>80)throw Error('transaction-read-window-too-large')
 for(let offset=0;offset<unique.length;offset+=4){
  const chunk=unique.slice(offset,offset+4),values=tx.getMany?await tx.getMany(chunk):await Promise.all(chunk.map(path=>tx.get(path)))
  if(values.length!==chunk.length)throw Error('transaction-read-window-incomplete')
  chunk.forEach((path,index)=>records.set(path,values[index]))
 }
 return records
}
