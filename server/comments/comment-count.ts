/** Only approved, publicly visible comments. Missing legacy totals remain unknown until preparation. */
export function publicCommentCount(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error('invalid-comment-count')
  return Number(value)
}
export function changeCommentCount(value: unknown, delta: 1 | -1) {
  const count = publicCommentCount(value)
  if (count === undefined) return {}
  const next = count + delta
  if (!Number.isSafeInteger(next) || next < 0) throw new Error('invalid-comment-count')
  return {commentCount: next}
}
