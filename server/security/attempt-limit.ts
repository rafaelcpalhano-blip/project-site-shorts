import type { AtomicStore } from '../firestore/atomic-store.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
export interface AttemptLimitOptions {
  store: AtomicStore
  now: () => Date
  maximum: number
  windowMs: number
  scope?: 'submission' | 'game-search' | 'video-preview'
}
// Operational thresholds are explicit configuration, separate from the five-publication quota.
export function createAttemptLimiter(options: AttemptLimitOptions) {
  if (!Number.isSafeInteger(options.maximum) || options.maximum < 1 ||
      !Number.isSafeInteger(options.windowMs) || options.windowMs < 1000) throw new Error('Invalid attempt limit')
  if (options.scope && !['submission', 'game-search', 'video-preview'].includes(options.scope)) throw new Error('Invalid limit scope')
  return async (visitorHash: string): Promise<void> => {
    if (!/^[a-f0-9]{64}$/.test(visitorHash)) throw new SubmissionError('invalid-visitor')
    await options.store.transact(async transaction => {
      const now = options.now()
      const time = now.getTime()
      if (!Number.isSafeInteger(time) || time < 0) throw new Error('Invalid server clock')
      const path = (options.scope === 'video-preview' ? 'videoPreviewAttempts/' : options.scope === 'game-search' ? 'gameSearchAttempts/' : 'submissionAttempts/') + visitorHash
      const previous = await transaction.get(path)
      let count = 0
      let startsAt = time
      if (previous) {
        if (!Number.isSafeInteger(previous.count) || Number(previous.count) < 0 ||
            !(previous.startsAt instanceof Date) || !Number.isSafeInteger(previous.startsAt.getTime())) {
          throw new Error('Invalid attempt record')
        }
        const start = previous.startsAt.getTime()
        if (start > time) throw new Error('Server clock moved backwards')
        if (time - start < options.windowMs) { count = Number(previous.count); startsAt = start }
      }
      if (count >= options.maximum) throw new SubmissionError('abuse-limit')
      transaction.set(path, { count: count + 1, startsAt: new Date(startsAt), updatedAt: now })
    })
  }
}

