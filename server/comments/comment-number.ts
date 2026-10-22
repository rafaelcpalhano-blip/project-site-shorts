import type { AtomicTransaction, RecordData, AtomicStore } from '../firestore/atomic-store.ts'
export function commentNumber(value:unknown):number|undefined {
  if(value===undefined)return
  if(!Number.isSafeInteger(value)||Number(value)<1)throw Error('invalid-comment-number')
  return Number(value)
}
export async function nextCommentNumber(tx:AtomicTransaction,shortId:string,short:RecordData) {
  if(short.lastCommentNumber===undefined) {
    if(short.hasPublishedComments===true||Number(short.commentCount)>0||tx.hasPublishedComment&&await tx.hasPublishedComment(shortId))throw Error('comment-numbering-preparing')
    return 1
  }
  if(!Number.isSafeInteger(short.lastCommentNumber)||Number(short.lastCommentNumber)<0||Number(short.lastCommentNumber)>=Number.MAX_SAFE_INTEGER)throw Error('invalid-comment-sequence')
  return Number(short.lastCommentNumber)+1
}
// Explicit, bounded maintenance; callers must bind this to a local emulator only.
export async function prepareCommentNumbers(shortId:string,store:AtomicStore,apply=false) {
  if(!/^[\w-]{1,128}$/.test(shortId))throw Error('invalid-short')
  return store.transact(async tx=>{
    const short=await tx.get('shorts/'+shortId)
    if(!short)throw Error('short-unavailable')
    if(short.lastCommentNumber!==undefined){if(!Number.isSafeInteger(short.lastCommentNumber)||Number(short.lastCommentNumber)<0)throw Error('invalid-comment-sequence');return {shortId,changed:false,comments:0,lastNumber:Number(short.lastCommentNumber)}}
    if(!tx.publishedCommentHistory)throw Error('history-unavailable')
    const history=await tx.publishedCommentHistory(shortId)
    if(history.length>200)throw Error('history-limit-200')
    history.sort((a,b)=>(a.data.createdAt as Date).getTime()-(b.data.createdAt as Date).getTime()||(a.id<b.id?-1:a.id>b.id?1:0))
    if(history.some(row=>row.data.shortId!==shortId||!['approved','removed'].includes(String(row.data.moderationStatus))||!(row.data.createdAt instanceof Date)||!Number.isSafeInteger(row.data.createdAt.getTime())||row.data.publicationNumber!==undefined))throw Error('unexpected-comment-history')
    if(apply){history.forEach((row,index)=>tx.set('comments/'+row.id,{...row.data,publicationNumber:index+1}));tx.set('shorts/'+shortId,{...short,lastCommentNumber:history.length})}
    return {shortId,changed:apply,comments:history.length,lastNumber:history.length}
  })
}
