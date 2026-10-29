import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
/** Request-scoped only. Every chunk uses the exact snapshot from the source
 * query. Never recover a failed batch using current-state reads. */
export async function readRankingSnapshots(store:AtomicStore,paths:string[],readTime:string){
 if(!Array.isArray(paths)||typeof readTime!=='string'||!Number.isFinite(Date.parse(readTime))||new Set(paths).size!==paths.length||paths.length>30||paths.some(p=>!(p==='rankingState/metrics'||/^(games|rankingMetrics)\/[\w-]{1,128}$/.test(p))))throw Error('ranking-invalid-snapshot-batch')
 const result=new Map<string,RecordData|null>()
 for(let offset=0;offset<paths.length;offset+=16){
  const chunk=paths.slice(offset,offset+16);let rows:Array<RecordData|null>
  if(store.rankingSnapshotGetMany)rows=await store.rankingSnapshotGetMany(chunk,readTime)
  else{if(!store.snapshotGet)throw Error('ranking-store-unavailable');rows=[];for(const path of chunk)rows.push(await store.snapshotGet(path,readTime))}
  if(!Array.isArray(rows)||rows.length!==chunk.length||rows.some(row=>row!==null&&(!row||typeof row!=='object'||Array.isArray(row))))throw Error('ranking-invalid-snapshot-batch')
  chunk.forEach((path,n)=>result.set(path,rows[n]))
 }
 return result
}
