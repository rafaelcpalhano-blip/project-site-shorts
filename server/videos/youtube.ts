import { validateVideoTitle } from '../../src/lib/validation/public-input.ts'
import { parseVideoUrl } from '../../src/lib/validation/video-url.ts'
import type { VideoEvidence } from '../submissions/decision.ts'
interface Options { apiKey: string; fetcher?: typeof fetch }
export function createYouTubeVerifier(options: Options) {
  if (!options.apiKey.trim()) throw new Error('YouTube API key required')
  const fetcher = options.fetcher ?? fetch
  return async (submission: { url: string }): Promise<VideoEvidence> => {
    const evidence: VideoEvidence = { existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] }
    try {
      const video = parseVideoUrl(submission.url)
      if (video.platform !== 'YouTube') return evidence
      const id = video.identity.slice('YouTube:'.length)
      const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos')
      endpoint.searchParams.set('id', id)
      endpoint.searchParams.set('part', 'snippet,status,contentDetails')
      endpoint.searchParams.set('fields', 'items(id,snippet(title),status(privacyStatus,uploadStatus,embeddable),contentDetails(duration))')
      // This server-only URL must never be logged or returned to the browser.
      endpoint.searchParams.set('key', options.apiKey)
      const response = await fetcher(endpoint, { redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) return evidence
      const result = await response.json()
      if (!result || !Array.isArray(result.items)) return evidence
      // Empty results also cover private/inaccessible videos; do not assert deletion.
      if (result.items.length !== 1 || result.items[0]?.id !== id) return evidence
      const item = result.items[0]
      if (!['public', 'unlisted'].includes(item.status?.privacyStatus) || item.status?.uploadStatus !== 'processed') return evidence
      evidence.existence = 'confirmed'
      evidence.embedding = item.status?.embeddable === true ? 'allowed' :
        item.status?.embeddable === false ? 'blocked' : 'unknown'
      if (typeof item.snippet?.title === 'string' && item.snippet.title.trim() && item.snippet.title.length <= 500 &&
          ![...item.snippet.title].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
        evidence.title = item.snippet.title.trim()
      }
      const duration = typeof item.contentDetails?.duration === 'string' ?
        item.contentDetails.duration.match(/^P(?:(\d+)D)?(?:T(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/) : null
      if (duration && duration.slice(1).some((part: string | undefined) => part !== undefined)) {
        const seconds = Number(duration[1] || 0) * 86400 + Number(duration[2] || 0) * 3600 +
          Number(duration[3] || 0) * 60 + Number(duration[4] || 0)
        // Clipzone eligibility, not a claim of official Shorts classification. No rounding/tolerance.
        if (Number.isFinite(seconds) && seconds > 0) evidence.shortFormat = seconds <= 180 ? 'confirmed' : 'invalid'
      }
      // URL + duration implement the site's policy, not a universal YouTube isShort certificate.
      // embeddable=true cannot guarantee playback in every region or after a policy change.
      // Game assignment remains the visitor's declaration; no audiovisual verdict is invented.
      return evidence
    } catch { return evidence }
  }
}

/** Public metadata fallback: no API key, no HTML/scripts, no publication verdict. */
export function createYouTubeOEmbedVerifier(fetcher: typeof fetch = fetch) {
  return async (submission: { url: string }): Promise<VideoEvidence> => {
    const evidence: VideoEvidence = { existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] }
    try {
      const video = parseVideoUrl(submission.url)
      if (video.platform !== 'YouTube') return evidence
      const endpoint = new URL('https://www.youtube.com/oembed')
      endpoint.searchParams.set('url', 'https://www.youtube.com/watch?v=' + video.identity.slice('YouTube:'.length))
      endpoint.searchParams.set('format', 'json')
      const response = await fetcher(endpoint, { redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) return evidence
      const result = await response.json()
      if (result?.type !== 'video' || result.provider_name !== 'YouTube' ||
          !['https://www.youtube.com', 'https://www.youtube.com/'].includes(result.provider_url)) return evidence
      evidence.existence = 'confirmed'
      evidence.title = validateVideoTitle(result.title)
    } catch { /* Unavailable titles never authorize publication. */ }
    return evidence
  }
}
