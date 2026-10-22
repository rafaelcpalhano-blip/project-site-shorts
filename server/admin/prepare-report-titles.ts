import type {AtomicStore} from '../firestore/atomic-store.ts'
import {reportTitlesState} from './list-page.ts'
/** Explicit maintenance task, never invoked by a visitor's request. */
export async function prepareReportTitles(store:AtomicStore){
 if(!store.scanReportSummaries)throw Error('scan-unavailable')
 await store.transact(async tx=>tx.set(reportTitlesState,{version:1,ready:false}))
 let after:string|undefined,examined=0,updated=0
 for(let page=0;page<1000;page++){
  const rows=await store.scanReportSummaries(after)
  for(const row of rows){
   if(!/^[a-f0-9]{64}$/.test(row.id))throw Error('invalid-summary-id')
   const changed=await store.transact(async tx=>{
    const summary=await tx.get('reportSummaries/'+row.id),short=await tx.get('shorts/'+row.id)
    if(!summary)return false
    if(typeof short?.title!=='string'||short.title.length>500)throw Error('invalid-summary-source')
    if(summary.title===short.title)return false
    tx.set('reportSummaries/'+row.id,{...summary,title:short.title});return true
   })
   examined++;if(changed)updated++
  }
  if(rows.length<30){await store.transact(async tx=>tx.set(reportTitlesState,{version:1,ready:true}));return {examined,updated}}
  const last=rows.at(-1)!.id;if(last===after)throw Error('invalid-scan-cursor');after=last
 }
 throw Error('preparation-limit-reached')
}
