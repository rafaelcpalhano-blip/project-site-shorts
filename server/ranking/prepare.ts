import type {AtomicStore,RecordData} from '../firestore/atomic-store.ts'
import {likeCount} from '../likes/short-likes.ts'
export async function prepareRanking(options:{store:AtomicStore;now:()=>Date;apply?:boolean;maximum?:number}){
 const {store}=options,maximum=options.maximum??300
 if(!store.rankingSourcePage||!Number.isSafeInteger(maximum)||maximum<1||maximum>300)throw Error('ranking-invalid-preparation')
 let after:string|undefined,readTime:string|undefined
 const rows:Array<{id:string;data:RecordData}>=[]
 // Complete validation before any preparation write; never silently truncate a migration.
 for(;;){const page=await store.rankingSourcePage(after,readTime);readTime=page.readTime
  for(const row of page.items){if(!/^[\w-]{1,128}$/.test(row.id)||rows.length>=maximum)throw Error('ranking-preparation-limit');likeCount(row.data.likeCount);rows.push(row)}
  if(page.items.length<30)break
  after=page.items.at(-1)!.id
 }
 let missingCounts=0,metricsPending=0,changed=0
 for(const row of rows){
  const result=await store.transact(async tx=>{
   const path='shorts/'+row.id,current=await tx.get(path),metric=await tx.get('rankingMetrics/'+row.id)
   if(!current)throw Error('ranking-source-changed')
   likeCount(current.likeCount)
   const missing=current.likeCount===undefined,pending=metric?.version!==1||metric.ready!==true
   if(options.apply){
    if(missing)tx.set(path,{...current,likeCount:0})
    // A missing historical signal is NOT a zero engagement score.
    if(!metric)tx.create('rankingMetrics/'+row.id,{version:1,ready:false,shortId:row.id,createdAt:options.now()})
   }
   return {missing,pending,changed:!!options.apply&&(missing||!metric)}
  });missingCounts+=Number(result.missing);metricsPending+=Number(result.pending);changed+=Number(result.changed)
 }
 return {examined:rows.length,missingCounts,metricsPending,changed,applied:!!options.apply}
}
