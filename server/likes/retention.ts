import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import { likeRecord } from './short-likes.ts'
const days90=90*24*60*60*1000
function expired(collection:'shortLikes'|'likeAttempts',record:RecordData|null,cutoff:number){
 if(!record)return false
 if(collection==='shortLikes'){
  if(typeof record.shortId!=='string'||!/^[\w-]{1,128}$/.test(record.shortId))return false
  try{likeRecord(record,record.shortId)}catch{return false}
  return record.liked===false&&(record.changedAt as Date).getTime()<cutoff
 }
 return Number.isSafeInteger(record.count)&&Number(record.count)>=0&&record.startsAt instanceof Date&&Number.isFinite(record.startsAt.getTime())&&record.updatedAt instanceof Date&&Number.isFinite(record.updatedAt.getTime())&&record.startsAt.getTime()<=record.updatedAt.getTime()&&record.updatedAt.getTime()<cutoff
}
// Explicit maintenance, not a public endpoint or automatically scheduled job.
export async function cleanupLikes(options:{store:AtomicStore;now:()=>Date;collection:'shortLikes'|'likeAttempts';after?:string;apply?:boolean;maximumRecords?:number}){
 const {store,collection}=options,cutoff=options.now().getTime()-days90
 if(!['shortLikes','likeAttempts'].includes(collection)||options.after!==undefined&&!/^[a-f0-9]{64}$/.test(options.after)||!Number.isFinite(cutoff))throw new Error('invalid-retention-input')
 if(!store.scanLikeRecords)throw new Error('retention-unavailable')
 const maximum=options.maximumRecords??30
 if(!Number.isSafeInteger(maximum)||maximum<1||maximum>30)throw Error('invalid-retention-limit')
 const rows=await store.scanLikeRecords(collection,options.after)
 if(rows.length>30||rows.some(row=>!/^[a-f0-9]{64}$/.test(row.id)))throw new Error('invalid-retention-page')
 let eligible=0,deleted=0
 for(const row of rows.slice(0,maximum)){
  if(!expired(collection,row.data,cutoff))continue
  eligible++
  if(options.apply)deleted+=await store.transact(async tx=>{
   const path=collection+'/'+row.id,record=await tx.get(path)
   if(!expired(collection,record,cutoff))return 0
   if(!tx.delete)throw new Error('retention-unavailable')
   tx.delete(path);return 1
  })
 }
 return {collection,examined:Math.min(rows.length,maximum),eligible,deleted,next:rows.length>=maximum?rows[Math.min(rows.length,maximum)-1].id:null}
}
