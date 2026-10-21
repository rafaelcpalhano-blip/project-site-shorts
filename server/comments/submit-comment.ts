import { prepareEngagement } from '../ranking/engagement.ts'
import { shortGameVisible } from '../games/visibility.ts'
import { validateCommentSubmission } from '../../src/lib/validation/comment-input.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
import { moderateText } from './moderate-text.ts'
export type CommentStatus = 'approved' | 'pending' | 'rejected' | 'removed'
export class CommentError extends Error {
  readonly status: number
  constructor(code: string, status: number) { super(code); this.status = status }
}
async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function submitComment(input: unknown, visitorHash: string, options: { store: AtomicStore; now: () => Date }) {
  if (!/^[a-f0-9]{64}$/.test(visitorHash)) throw new CommentError('invalid-session', 401)
  const data = validateCommentSubmission(input)
  const id = await digest(visitorHash + ':' + data.requestId)
  const payloadHash = await digest(JSON.stringify([data.shortId, data.content]))
  const fingerprint = await digest(JSON.stringify([visitorHash, data.shortId, data.content.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')]))
  const verdict = moderateText(data.content)
  return options.store.transact(async tx => {
    const now = options.now()
    if (!Number.isSafeInteger(now.getTime()) || now.getTime() < 0) throw new Error('invalid-clock')
    const short = await tx.get('shorts/' + data.shortId)
    if (short?.moderationStatus !== 'published' || !await shortGameVisible(short, tx)) throw new CommentError('short-unavailable', 404)
    const receipt = await tx.get('commentRequests/' + id)
    const previous = await tx.get('comments/' + id)
    const recent = await tx.get('commentDedup/' + fingerprint)
    if (receipt) {
      if (receipt.visitorHash !== visitorHash || receipt.payloadHash !== payloadHash || !previous ||
          previous.shortId !== data.shortId || previous.content !== data.content ||
          !['approved','pending','rejected','removed'].includes(String(previous.moderationStatus))) {
        throw new CommentError('request-conflict', 409)
      }
      return { id, status: previous.moderationStatus as CommentStatus, repeated: true }
    }
    if (previous) throw new Error('invalid-receipt')
    if (recent) {
      if (!(recent.createdAt instanceof Date) || !Number.isSafeInteger(recent.createdAt.getTime()) ||
          recent.createdAt.getTime() < 0 || recent.createdAt.getTime() > now.getTime()) throw new Error('invalid-dedup')
      if (now.getTime() - recent.createdAt.getTime() < 60000) throw new CommentError('duplicate-comment', 409)
    }
    const applyRanking=verdict.status==='approved'?await prepareEngagement(tx,{shortId:data.shortId,gameId:short.gameId as string,kind:'comment',sourceId:id,identity:visitorHash,at:now,now,active:true}):()=>{}
    applyRanking()
    tx.create('comments/' + id, { shortId: data.shortId, content: data.content, createdAt: now,
      moderationStatus: verdict.status, reviewVersion: 0 })
    // Ownership, request fingerprints and triage flags never enter public comment documents.
    tx.create('commentRequests/' + id, { visitorHash, payloadHash, flags: verdict.flags, createdAt: now })
    tx.set('commentDedup/' + fingerprint, { commentId: id, createdAt: now })
    tx.create('moderationLogs/' + crypto.randomUUID(), { contentType: 'comment', contentId: id,
      action: verdict.status, reasonCode: verdict.status === 'approved' ? 'local-text-accepted' : 'local-text-review',
      createdAt: now, actor: 'automatic' })
    return { id, status: verdict.status as CommentStatus, repeated: false }
  })
}
