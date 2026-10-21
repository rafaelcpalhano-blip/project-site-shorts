import { emptyRankingMetric } from '../ranking/engagement.ts'
import { isVisibleGame } from '../games/visibility.ts'
import { TITLE_SEARCH_ENABLED } from '../../src/lib/features/title-search.ts'
import { titleSearchFields } from '../../src/lib/validation/title-search.ts'
import { validateSubmissionInput, validateVideoTitle } from '../../src/lib/validation/public-input.ts'
import { saoPauloDayKey } from '../../src/lib/validation/day-key.ts'
import { decidePublication } from './decision.ts'
import type { VideoEvidence } from './decision.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
type Submission = ReturnType<typeof validateSubmissionInput>
export interface SubmissionDependencies {
  store: AtomicStore
  // Both implementations must be trusted server services, never client-supplied verdicts.
  checkAbuse: (visitorHash: string) => Promise<void>
  verify: (submission: Submission) => Promise<VideoEvidence>
  now: () => Date
}
export class SubmissionError extends Error {
  readonly code: string
  readonly publicShortId?: string
  constructor(code: string, publicShortId?: string) { super(code); this.code = code; this.publicShortId = publicShortId }
}
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function submitShort(input: unknown, visitorHash: string, dependencies: SubmissionDependencies) {
  // visitorHash must originate in signed anonymous identity middleware, not a JSON field.
  if (!/^[a-f0-9]{64}$/.test(visitorHash)) throw new SubmissionError('invalid-visitor')
  await dependencies.checkAbuse(visitorHash)
  const submission = validateSubmissionInput(input)
  let evidence: VideoEvidence
  try { evidence = await dependencies.verify(submission) }
  catch { evidence = { existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] } }
  const decision = decidePublication(evidence, submission.platform)
  // Unverified attempts never reserve an identity, create a pending item or spend quota.
  if (decision.status === 'rejected' || decision.status === 'retry') throw new SubmissionError(decision.reason)
  const identityId = await hash(submission.identity)
  return dependencies.store.transact(async transaction => {
    const now = dependencies.now()
    const dateKey = saoPauloDayKey(now)
    const quotaPath = 'submissionLimits/' + visitorHash + '-' + dateKey
    const game = await transaction.get('games/' + submission.gameId)
    if (!game || !isVisibleGame(game)) throw new SubmissionError('invalid-game')
    const reserved = await transaction.get('videoIdentities/' + identityId)
    if (reserved) {
      const existing = await transaction.get('shorts/' + identityId)
      throw new SubmissionError('duplicate-video', existing?.moderationStatus === 'published' ? identityId : undefined)
    }
    const quota = await transaction.get(quotaPath)
    const count = quota?.count ?? 0
    if (!Number.isInteger(count) || Number(count) < 0) throw new SubmissionError('invalid-quota')
    if (decision.status === 'published' && Number(count) >= 5) throw new SubmissionError('daily-limit')
    const originalTitle = typeof evidence.title === 'string' && evidence.title.trim() ? validateVideoTitle(evidence.title) : null
    const title = submission.title || originalTitle || 'Short de ' + String(game.officialName || 'game')
    if (title.length > 500) throw new SubmissionError('invalid-metadata')
    const ranking=await transaction.get('rankingState/metrics')
    transaction.create('videoIdentities/' + identityId, { shortId: identityId, identity: submission.identity, createdAt: now })
    transaction.create('shorts/' + identityId, {
      originalUrl: submission.originalUrl, normalizedUrl: submission.url,
      platform: submission.platform, platformVideoId: submission.identity.slice(submission.platform.length + 1),
      ...(TITLE_SEARCH_ENABLED ? titleSearchFields(title) : {}),
      title, originalTitle, channelName: submission.channelName, gameId: submission.gameId,
      createdAt: now, moderationStatus: decision.status, likeCount: 0,
    })
    if(ranking?.ready===true&&typeof ranking.epoch==='string')transaction.create('rankingMetrics/'+identityId,emptyRankingMetric(identityId,submission.gameId,now,ranking.epoch))
    // Private ownership supports later quota accounting on approval; never in public short documents.
    transaction.create('submissionOwners/' + identityId, { visitorHash, createdAt: now })
    transaction.create('moderationLogs/' + crypto.randomUUID(), {
      contentType: 'short', contentId: identityId, action: decision.status,
      reasonCode: decision.reason, createdAt: now, actor: 'automatic',
    })
    if (decision.status === 'published') transaction.set(quotaPath, {
      identifierHash: visitorHash, dateKey, count: Number(count) + 1, updatedAt: now,
    })
    return { id: identityId, status: decision.status, remaining: Math.max(0, 5 - Number(count) - (decision.status === 'published' ? 1 : 0)) }
  })
}


