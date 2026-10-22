import { isVisibleGame } from '../games/visibility.ts'
import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
import { hasTechnicalEligibility } from '../submissions/decision.ts'
import { validateSubmissionInput } from '../../src/lib/validation/public-input.ts'
import { saoPauloDayKey } from '../../src/lib/validation/day-key.ts'
import type { ReviewAction } from '../../src/features/admin/types/moderation.ts'

export class ReviewError extends Error {
  readonly status: number
  constructor(message: string, status = 409) { super(message); this.status = status }
}
export interface ReviewInput { shortId: string; action: ReviewAction; reason: string; revision: number; reportCount: number }
export function parseReview(input: unknown): ReviewInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ReviewError('invalid-input', 400)
  const data = input as RecordData
  if (Object.keys(data).some(key => !['shortId', 'action', 'reason', 'revision', 'reportCount'].includes(key)) ||
      typeof data.shortId !== 'string' || !/^[a-f0-9]{64}$/.test(data.shortId) ||
      !['dismiss', 'approve', 'remove', 'restore', 'block'].includes(String(data.action)) ||
      typeof data.reason !== 'string' || data.reason.trim().length < 5 || data.reason.trim().length > 500 ||
      [...data.reason].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
      !Number.isSafeInteger(data.revision) || Number(data.revision) < 0 ||
      !Number.isSafeInteger(data.reportCount) || Number(data.reportCount) < 0) throw new ReviewError('invalid-input', 400)
  return { shortId: data.shortId, action: data.action as ReviewAction, reason: data.reason.trim(),
    revision: Number(data.revision), reportCount: Number(data.reportCount) }
}
export function counter(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error('invalid-counter')
  return Number(value)
}
export function restoreTarget(short: RecordData, state: RecordData | null): 'published' | 'pending' | null {
  if (short.moderationStatus !== 'removed' || state?.removedRevision !== counter(short.reviewVersion ?? 0)) return null
  return state?.previousStatus === 'published' || state?.previousStatus === 'pending' ? state.previousStatus : null
}
export function publishedBeforeBlock(short:RecordData):boolean {
 if(short.administrativeBlock===undefined)return false
 const value=short.administrativeBlock as RecordData|null
 if(!value||typeof value!=='object'||Array.isArray(value)||value.previousStatus!=='published'||!(value.blockedAt instanceof Date)||!Number.isFinite(value.blockedAt.getTime()))throw Error('invalid-block-state')
 return true
}
export async function reviewShort(input: ReviewInput, uid: string, options: {
  store: AtomicStore; now: () => Date; verify: SubmissionDependencies['verify']
}) {
  if (!uid || uid.length > 128) throw new Error('invalid-actor')
  let verified: RecordData | null = null
  let restoreStatus: 'published' | 'pending' | null = null
  if (input.action === 'approve' || input.action === 'restore') {
    const snapshot = await options.store.transact(async tx => ({
      short: await tx.get('shorts/' + input.shortId),
      state: input.action === 'restore' ? await tx.get('moderationStates/' + input.shortId) : null,
    }))
    verified = snapshot.short
    if (!verified || verified.moderationStatus !== (input.action === 'restore' ? 'removed' : 'pending')) throw new ReviewError('stale-review')
    if (input.action === 'restore') {
      restoreStatus = restoreTarget(verified, snapshot.state)
      if (!restoreStatus) throw new ReviewError('restore-unavailable')
    }
    const submission = validateSubmissionInput({ url: verified.normalizedUrl, gameId: verified.gameId,
      title: verified.title, channelName: verified.channelName })
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(submission.identity))
    const identityId = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    if (identityId !== input.shortId) throw new ReviewError('invalid-video', 422)
    if (input.action === 'approve' || restoreStatus === 'published') {
      const evidence = await options.verify(submission)
      // Human review may resolve content flags; technical uncertainty cannot be overridden.
      if (!hasTechnicalEligibility(evidence, submission.platform)) {
        throw new ReviewError('verification-incomplete', 422)
      }
    }
  }
  return options.store.transact(async tx => {
    const path = 'shorts/' + input.shortId
    const short = await tx.get(path)
    if (!short) throw new ReviewError('short-unavailable', 404)
    const summary = await tx.get('reportSummaries/' + input.shortId)
    const state = input.action === 'restore' ? await tx.get('moderationStates/' + input.shortId) : null
    const revision = counter(short.reviewVersion ?? 0)
    const count = counter(summary?.count ?? 0)
    if (revision !== input.revision || count !== input.reportCount) throw new ReviewError('stale-review')
    if (revision >= Number.MAX_SAFE_INTEGER) throw new Error('invalid-revision')
    const status = short.moderationStatus
    if (input.action === 'restore' ? status !== 'removed' : input.action === 'approve' ? status !== 'pending' : input.action === 'block' ? status !== 'published' :
      !['published', 'pending'].includes(String(status))) throw new ReviewError('stale-review')
    if (input.action === 'restore' && (!restoreStatus || restoreTarget(short, state) !== restoreStatus)) throw new ReviewError('restore-unavailable')
    if (input.action === 'dismiss' && (!summary || summary.status !== 'pending')) throw new ReviewError('stale-review')
    const now = options.now()
    if (!Number.isFinite(now.getTime())) throw new Error('invalid-clock')
    let quotaPath: string | undefined
    let quota: RecordData | null = null
    let ownerHash = ''
    if (input.action === 'approve' || input.action === 'restore') {
      if (!verified || ['normalizedUrl', 'gameId', 'title', 'channelName'].some(key => short[key] !== verified![key])) throw new ReviewError('stale-review')
      const reservation = await tx.get('videoIdentities/' + input.shortId)
      if (reservation?.shortId !== input.shortId) throw new ReviewError('invalid-video', 422)
      if (input.action === 'approve' || restoreStatus === 'published') {
        const game = await tx.get('games/' + String(short.gameId))
        if (!isVisibleGame(game)) throw new ReviewError('invalid-video', 422)
      }
      if (input.action === 'approve' && !publishedBeforeBlock(short)) {
        const owner = await tx.get('submissionOwners/' + input.shortId)
        if (typeof owner?.visitorHash !== 'string' || !/^[a-f0-9]{64}$/.test(owner.visitorHash)) throw new Error('invalid-owner')
        ownerHash = owner.visitorHash
        quotaPath = 'submissionLimits/' + ownerHash + '-' + saoPauloDayKey(now)
        quota = await tx.get(quotaPath)
        if (counter(quota?.count ?? 0) >= 5) throw new ReviewError('daily-limit', 429)
      }
    }
    const nextStatus = input.action === 'restore' ? restoreStatus! :
      input.action === 'approve' ? 'published' : input.action === 'remove' ? 'removed' : input.action === 'block' ? 'pending' : String(status)
    const updated:RecordData={...short,moderationStatus:nextStatus,reviewVersion:revision+1}
    if(input.action==='block')updated.administrativeBlock={previousStatus:'published',blockedAt:now}
    if(input.action==='approve')delete updated.administrativeBlock
    tx.set(path,updated)
    if (input.action === 'remove') tx.set('moderationStates/' + input.shortId, { previousStatus: status, removedRevision: revision + 1 })
    if (input.action === 'restore') tx.set('moderationStates/' + input.shortId, { ...state, restoredAt: now, restoredRevision: revision + 1 })
    if (summary) tx.set('reportSummaries/' + input.shortId, { ...summary, status: 'reviewed',
      reviewedCount: count, reviewedAt: now, reviewReason: input.reason })
    if (quotaPath) tx.set(quotaPath, { ...(quota ?? {}), identifierHash: ownerHash,
      dateKey: saoPauloDayKey(now), count: counter(quota?.count ?? 0) + 1, updatedAt: now })
    tx.create('moderationLogs/' + crypto.randomUUID(), {
      contentType: 'short', contentId: input.shortId, action: input.action, reason: input.reason,
      previousStatus: status, resultingStatus: nextStatus, reportCount: count, revision: revision + 1,
      createdAt: now, actor: uid,
    })
    // Restoring the original state never deletes the identity or charges a publication twice.
    return { id: input.shortId, status: nextStatus, revision: revision + 1 }
  })
}
