import type {AtomicStore, RecordData} from '../firestore/atomic-store.ts'
import {cleanupLikes} from '../likes/retention.ts'

type Collection = 'networkAbuse' | 'shortLikes' | 'likeAttempts'
type Source = Pick<AtomicStore, 'expiredNetworkRecords' | 'scanLikeRecords'>
type Row = {id:string; data:RecordData}
export class RetentionInspectionError extends Error {
 constructor(code:'invalid-retention-inspection'|'retention-inspection-unavailable'|'retention-inspection-aborted') {super(code)}
}
/** Opt-in read-only library. No credentials, default transport, CLI, HTTP route,
 * timer or writes. One source query, at most thirty returned documents.
 * Results are a page observation, never authorization or proof of a later delete. */
export async function inspectAuxiliaryRetention(input:unknown, dependencies:{store:Source;now:()=>Date;signal?:AbortSignal}) {
 const invalid=()=>{throw new RetentionInspectionError('invalid-retention-inspection')}
 if(!input||typeof input!=='object'||Array.isArray(input))return invalid()
 const data=input as Record<string,unknown>
 if(Object.keys(data).some(k=>!['collection','after'].includes(k)))return invalid()
 if(typeof data.collection!=='string'||!['networkAbuse','shortLikes','likeAttempts'].includes(data.collection))return invalid()
 const collection=data.collection as Collection,after=data.after
 if(after!==undefined&&(collection==='networkAbuse'||typeof after!=='string'||!/^[a-f0-9]{64}$/.test(after)))return invalid()
 try {
  const at=dependencies.now().getTime(),source=dependencies.store,signal=dependencies.signal
  if(!Number.isSafeInteger(at)||at<0)return invalid()
  const stop=()=>{if(signal?.aborted)throw new RetentionInspectionError('retention-inspection-aborted')}
  stop()
  let returnedDocuments=0
  const page=(rows:Row[])=>{
   if(!Array.isArray(rows)||rows.length>30||rows.some(row=>!row||typeof row.id!=='string'||!/^[a-f0-9]{64}$/.test(row.id)||!row.data||typeof row.data!=='object'||Array.isArray(row.data))||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('invalid-page')
   returnedDocuments=rows.length
   return rows
  }
  if(collection==='networkAbuse'){
   const query=source.expiredNetworkRecords
   if(!query)throw Error('source-unavailable')
   const rows=page(await query.call(source,new Date(at)));stop()
   const eligible=rows.filter(row=>row.data.expiresAt instanceof Date&&Number.isFinite(row.data.expiresAt.getTime())&&row.data.expiresAt.getTime()<=at).length
   return {mode:'inspect-only' as const,collection,observedAt:new Date(at).toISOString(),sourceQueries:1,returnedDocuments,examined:rows.length,eligible,deleted:0,next:null,continuationPossible:rows.length===30,scope:'first-expired-window' as const}
  }
  const scan=source.scanLikeRecords
  if(!scan)throw Error('source-unavailable')
  // This adapter exposes the existing eligibility logic without access to writes.
  const readOnly:AtomicStore={
   scanLikeRecords:async(kind,cursor)=>{
    const rows=page(await scan.call(source,kind,cursor));stop()
    if(rows.some((row,i)=>row.id<=(i?rows[i-1].id:cursor??'')))throw Error('invalid-page-order')
    return rows
   },
   transact:async()=>{throw Error('writes-forbidden')},
  }
  const result=await cleanupLikes({store:readOnly,now:()=>new Date(at),collection,after:after as string|undefined,apply:false,maximumRecords:30});stop()
  return {mode:'inspect-only' as const,collection,observedAt:new Date(at).toISOString(),sourceQueries:1,returnedDocuments,examined:result.examined,eligible:result.eligible,deleted:0,next:result.next,continuationPossible:result.next!==null,scope:'one-page' as const}
 }catch(error){
  if(error instanceof RetentionInspectionError)throw error
  throw new RetentionInspectionError('retention-inspection-unavailable')
 }
}
