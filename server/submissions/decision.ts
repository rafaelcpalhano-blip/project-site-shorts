export interface VideoEvidence {
  existence: 'confirmed' | 'missing' | 'unknown'
  shortFormat: 'confirmed' | 'invalid' | 'unknown'
  // Server-only policy exception; does not assert a measured duration.
  formatPolicy?: 'tiktok-platform-exception'
  // Informational only: the registered game is the visitor's declaration.
  gameMatch: 'confirmed' | 'mismatch' | 'unknown'
  embedding?: 'allowed' | 'blocked' | 'unknown'
  moderation: 'clear' | 'flagged' | 'unavailable'
  flags: Array<'gameplay-violence' | 'real-violence' | 'threat' | 'hate' | 'name-inconsistency'>
  thumbnailUrl?: string
  channelName?: string
  title?: string
}
export interface PublicationDecision { status: 'published' | 'pending' | 'rejected' | 'retry'; reason: string }
export function hasTechnicalEligibility(evidence: VideoEvidence, platform?: string): boolean {
  const acceptedFormat = evidence.shortFormat === 'confirmed' ||
    (platform === 'TikTok' && evidence.shortFormat === 'unknown' && evidence.formatPolicy === 'tiktok-platform-exception')
  return evidence.existence === 'confirmed' && acceptedFormat &&
    (evidence.embedding === undefined || evidence.embedding === 'allowed')
}
export function decidePublication(evidence: VideoEvidence, platform?: string): PublicationDecision {
  if (evidence.existence === 'missing') return { status: 'rejected', reason: 'video-not-found' }
  if (evidence.shortFormat === 'invalid') return { status: 'rejected', reason: 'not-a-short' }
  if (evidence.embedding === 'blocked') return { status: 'rejected', reason: 'embedding-disabled' }
  if (!hasTechnicalEligibility(evidence, platform)) return { status: 'retry', reason: 'verification-incomplete' }
  if (evidence.flags.some(flag => flag !== 'gameplay-violence') || evidence.moderation === 'flagged') {
    return { status: 'pending', reason: 'content-review' }
  }
  return { status: 'published', reason: platform === 'TikTok' && evidence.formatPolicy === 'tiktok-platform-exception'
    ? 'tiktok-platform-policy' : 'automatically-verified' }
}
