import type {AtomicStore} from '../firestore/atomic-store.ts'
import type {SubmissionDependencies} from '../submissions/submit-short.ts'
import {validateSubmissionInput} from '../../src/lib/validation/public-input.ts'
import {createThumbnail,readThumbnail} from './thumbnail.ts'
// Bounded maintenance only. Never invoked by feed reads or exposed as an HTTP endpoint.
export async function refreshThumbnails(options:{store:AtomicStore;verify:SubmissionDependencies['verify'];now:()=>Date;apply?:boolean;after?:string}){
 if(!options.store.scanShorts||options.after!==undefined&&!/^[-_a-zA-Z0-9]{1,128}$/.test(options.after))throw Error('thumbnail-invalid-maintenance')
 const rows=await options.store.scanShorts(options.after)
 if(rows.length>30)throw Error('thumbnail-invalid-page')
 const report={examined:rows.length,eligible:0,refreshed:0,discarded:0,unavailable:0,conflicts:0,next:rows.length===30?rows.at(-1)!.id:null}
 for(const row of rows){
  if(!/^[-_a-zA-Z0-9]{1,128}$/.test(row.id))throw Error('thumbnail-invalid-page')
  const data=row.data,identity=String(data.platform)+':'+String(data.platformVideoId),now=options.now()
  if(readThumbnail(data.thumbnail,String(data.platform),identity,now.getTime()))continue
  const hasImage=data.thumbnail!==undefined
  if(data.moderationStatus!=='published'&&!hasImage)continue
  report.eligible++
  if(!options.apply)continue
  let thumbnail:ReturnType<typeof createThumbnail>
  if(data.moderationStatus==='published')try{
   const input=validateSubmissionInput({url:data.normalizedUrl,gameId:data.gameId})
   if(input.identity!==identity)throw Error('invalid-identity')
   const evidence=await options.verify(input)
   if(evidence.existence==='confirmed')thumbnail=createThumbnail(evidence.thumbnailUrl,input.platform,input.identity,options.now())
  }catch{/* Optional metadata failure does not affect publication. */}
  if(!thumbnail)report.unavailable++
  if(!thumbnail&&!hasImage)continue
  const result=await options.store.transact(async tx=>{
   const current=await tx.get('shorts/'+row.id)
   if(!current||['normalizedUrl','platform','platformVideoId','moderationStatus'].some(key=>current[key]!==data[key])||readThumbnail(current.thumbnail,String(current.platform),identity,options.now().getTime()))return 'conflict'
   const updated={...current}
   if(thumbnail)updated.thumbnail=thumbnail
   else delete updated.thumbnail
   tx.set('shorts/'+row.id,updated)
   return thumbnail?'refreshed':'discarded'
  })
  if(result==='conflict')report.conflicts++
  else report[result]++
 }
 return report
}
