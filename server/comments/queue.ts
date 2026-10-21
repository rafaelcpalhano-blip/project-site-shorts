import type { AtomicStore } from '../firestore/atomic-store.ts'
import { parseQuery } from '../moderation/queue.ts'
import { ReviewError } from '../moderation/review-short.ts'
import { commentId, commentStatuses, mapComment } from './review-comment.ts'
function parseCursor(value: unknown) {
  if (value === undefined || value === null) return undefined
  const data = parseQuery(value,['time','id'])
  if (typeof data.time !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.time) ||
      !Number.isFinite(Date.parse(data.time))) throw new ReviewError('invalid-input',400)
  return {time:new Date(data.time).toISOString(),id:commentId(data.id)}
}
export async function loadCommentQueue(input:unknown, store:AtomicStore) {
  const data = parseQuery(input,['status','cursor'])
  if (!commentStatuses.includes(data.status as typeof commentStatuses[number])) throw new ReviewError('invalid-input',400)
  if (!store.query) throw new Error('query-unavailable')
  const rows = await store.query({collection:'comments',filter:{field:'moderationStatus',value:String(data.status)},
    orderBy:'createdAt',limit:21,cursor:parseCursor(data.cursor)})
  const items = rows.slice(0,20).map(({id,data:item})=>mapComment(id,item))
  const last = items.at(-1)
  return {items,next:rows.length>20 && last ? {time:last.createdAt,id:last.id}:null}
}
export async function loadCommentDetail(input:unknown, store:AtomicStore) {
  const data = parseQuery(input,['commentId'])
  const id = commentId(data.commentId)
  const result = await store.transact(async tx=>{
    const comment = await tx.get('comments/'+id)
    if (!comment) throw new ReviewError('comment-unavailable',404)
    const short = await tx.get('shorts/'+commentId(comment.shortId))
    const receipt = await tx.get('commentRequests/'+id)
    return {comment:mapComment(id,comment),parent:{title:String(short?.title??''),status:String(short?.moderationStatus??'unavailable')},
      flags:Array.isArray(receipt?.flags)?receipt.flags.filter(flag=>typeof flag === 'string' && ['threat','hate','offensive-language','spam'].includes(flag)):[]}
  })
  if (!store.query) throw new Error('query-unavailable')
  const logs = await store.query({collection:'moderationLogs',filter:{field:'contentId',value:id},orderBy:'createdAt',limit:10})
  return {...result,logs:logs.map(({data:log})=>({action:String(log.action??''),reason:String(log.reason??log.reasonCode??''),
    createdAt:log.createdAt instanceof Date ? log.createdAt.toISOString() : ''}))}
}
