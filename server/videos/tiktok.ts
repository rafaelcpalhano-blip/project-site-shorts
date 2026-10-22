import { thumbnailUrl } from '../../src/lib/validation/thumbnail.ts'
import { parseVideoUrl } from '../../src/lib/validation/video-url.ts'
import type { VideoEvidence } from '../submissions/decision.ts'
export function createTikTokVerifier(fetcher: typeof fetch = fetch) {
  return async (submission: { url: string }): Promise<VideoEvidence> => {
    const evidence: VideoEvidence = { existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] }
    try {
      const video = parseVideoUrl(submission.url)
      if (video.platform !== 'TikTok') return evidence
      const endpoint = new URL('https://www.tiktok.com/oembed')
      endpoint.searchParams.set('url', video.url)
      const response = await fetcher(endpoint, { redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) return evidence
      const result = await response.json()
      if (!result || result.type !== 'video' || result.version !== '1.0' || result.provider_name !== 'TikTok' ||
          !['https://www.tiktok.com', 'https://www.tiktok.com/'].includes(result.provider_url)) return evidence
      // Optional identity returned by TikTok must match the requested canonical video ID.
      if (result.embed_product_id !== undefined &&
          result.embed_product_id !== video.identity.slice('TikTok:'.length)) return evidence
      evidence.existence = 'confirmed'
      evidence.formatPolicy = 'tiktok-platform-exception'
      if (typeof result.title === 'string' && result.title.trim() && result.title.length <= 500 &&
          ![...result.title].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) evidence.title = result.title.trim()
      const image=thumbnailUrl(result.thumbnail_url,video.platform,video.identity)
      if(image)evidence.thumbnailUrl=image
      // Never execute oEmbed HTML/scripts or fetch image/author destinations on the server.
      // The approved platform exception permits unknown duration, not invented confirmation.
      // oEmbed does not prove short duration, game identity or content safety.
      return evidence
    } catch { return evidence }
  }
}
