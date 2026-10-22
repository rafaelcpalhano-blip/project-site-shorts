import { prepareEngagement } from '../ranking/engagement.ts'
import { shortGameVisible } from '../games/visibility.ts'
import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import { parseQuery } from '../moderation/queue.ts'
import { counter, ReviewError } from '../moderation/review-short.ts'
export const commentStatuses = ['pending','approved','rejected','removed'] as const
export function commentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) throw new ReviewError('invalid-input',400)
  return value
}
export function parseCommentReview(input: unknown) {
  const data = parseQuery(input,['commentId','action','reason','revision'])
  const id = commentId(data.commentId)
  if (!['approve','reject','remove','restore'].includes(String(data.action)) ||
      typeof data.reason !== 'string' || data.reason.trim().length < 5 || data.reason.trim().length > 500 ||
      [...data.reason].some(value => value.charCodeAt(0) < 32 || value.charCodeAt(0) === 127) ||
      !Number.isSafeInteger(data.revision) || Number(data.revision) < 0) throw new ReviewError('invalid-input',400)
  return { commentId:id, action:String(data.action), reason:data.reason.trim(), revision:Number(data.revision) }
}
export async function reviewComment(input: ReturnType<typeof parseCommentReview>, uid: string, options:{store:AtomicStore; now:()=>Date}) {
  if (!uid || uid.length > 128) throw new Error('invalid-actor')
  return options.store.transact(async tx => {
    const path = 'comments/' + input.commentId
    const comment = await tx.get(path)
    if (!comment) throw new ReviewError('comment-unavailable',404)
    const revision = counter(comment.reviewVersion ?? 0)
    if (revision !== input.revision || revision >= Number.MAX_SAFE_INTEGER) throw new ReviewError('stale-review')
    const status = String(comment.moderationStatus)
    const valid = input.action === 'approve' ? ['pending','rejected'].includes(status) :
      input.action === 'reject' ? status === 'pending' : input.action === 'remove' ? status === 'approved' : status === 'removed'
    if (!valid) throw new ReviewError('stale-review')
    const short = await tx.get('shorts/' + commentId(comment.shortId))
    if (['approve','restore'].includes(input.action) && (short?.moderationStatus !== 'published' || !await shortGameVisible(short, tx))) throw new ReviewError('short-unavailable',404)
    const now = options.now()
    if (!Number.isFinite(now.getTime())) throw new Error('invalid-clock')
    const next = input.action === 'approve' || input.action === 'restore' ? 'approved' : input.action === 'reject' ? 'rejected' : 'removed'
    let applyRanking=()=>{}
    if(next==='approved'||status==='approved'){
      const owner=await tx.get('commentRequests/'+input.commentId)
      if(short&&typeof short.gameId==='string')applyRanking=await prepareEngagement(tx,{shortId:String(comment.shortId),gameId:short.gameId,kind:'comment',sourceId:input.commentId,identity:typeof owner?.visitorHash==='string'?owner.visitorHash:undefined,at:comment.createdAt as Date,now,active:next==='approved'})
    }
    applyRanking()
    if (next === 'approved' && short && short.hasPublishedComments !== true) tx.set('shorts/' + String(comment.shortId), {...short, hasPublishedComments: true})
    tx.set(path,{...comment,moderationStatus:next,reviewVersion:revision+1})
    tx.create('moderationLogs/' + crypto.randomUUID(),{contentType:'comment',contentId:input.commentId,
      action:input.action,reason:input.reason,previousStatus:status,resultingStatus:next,
      revision:revision+1,createdAt:now,actor:uid})
    return {id:input.commentId,status:next,revision:revision+1}
  })
}
export function mapComment(id: string, data: RecordData) {
  if (typeof data.content !== 'string' || data.content.length > 500 ||
      !(data.createdAt instanceof Date) || !Number.isFinite(data.createdAt.getTime()) ||
      !commentStatuses.includes(data.moderationStatus as typeof commentStatuses[number])) throw new Error('invalid-comment')
  return {id:commentId(id),shortId:commentId(data.shortId),content:data.content,
    status:String(data.moderationStatus),createdAt:data.createdAt.toISOString(),revision:counter(data.reviewVersion??0)}
}
