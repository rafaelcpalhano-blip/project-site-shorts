export interface VideoEvidence {
  existence: 'confirmed' | 'missing' | 'unknown'
  shortFormat: 'confirmed' | 'invalid' | 'unknown'
  gameMatch: 'confirmed' | 'mismatch' | 'unknown'
  moderation: 'clear' | 'flagged' | 'unavailable'
  flags: Array<'gameplay-violence' | 'real-violence' | 'threat' | 'hate' | 'name-inconsistency'>
  title?: string
}
export interface PublicationDecision { status: 'published' | 'pending' | 'rejected'; reason: string }
export function decidePublication(evidence: VideoEvidence): PublicationDecision {
  if (evidence.existence === 'missing') return { status: 'rejected', reason: 'video-not-found' }
  if (evidence.shortFormat === 'invalid') return { status: 'rejected', reason: 'not-a-short' }
  if (evidence.flags.some(flag => flag !== 'gameplay-violence') || evidence.moderation === 'flagged') {
    return { status: 'pending', reason: 'content-review' }
  }
  if (evidence.gameMatch === 'mismatch') return { status: 'pending', reason: 'game-mismatch' }
  if (evidence.existence !== 'confirmed' || evidence.shortFormat !== 'confirmed' ||
      evidence.gameMatch !== 'confirmed' || evidence.moderation !== 'clear') {
    return { status: 'pending', reason: 'verification-incomplete' }
  }
  return { status: 'published', reason: 'automatically-verified' }
}

