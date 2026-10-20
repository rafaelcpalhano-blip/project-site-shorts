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
      endpoint.searchParams.set('part', 'snippet,status')
      endpoint.searchParams.set('fields', 'items(id,snippet(title),status(privacyStatus,uploadStatus,embeddable))')
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
      if (typeof item.snippet?.title === 'string' && item.snippet.title.trim() && item.snippet.title.length <= 500 &&
          ![...item.snippet.title].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
        evidence.title = item.snippet.title.trim()
      }
      // /shorts/ URLs and gaming categories can be supplied for ordinary videos.
      // Neither title nor embeddable=true proves Shorts format, game identity or safe content.
      // Even a processed video remains pending; embedding eligibility must be checked again
      // when a complete verification pipeline is configured.
      return evidence
    } catch { return evidence }
  }
}
