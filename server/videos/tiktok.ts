import { validateVideoTitle } from '../../src/lib/validation/public-input.ts'
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
      // Captions can contain ordinary line breaks/tabs. Normalize presentation only;
      // preserve accents/emoji, reject remaining controls and never truncate the source title.
      for (const candidate of [result.title, result.description]) {
        if (typeof candidate !== 'string' || candidate.length > 4096) continue
        try {
          evidence.title = validateVideoTitle(candidate.replace(/[\t\r\n\u2028\u2029]+/g, ' ').replace(/ {2,}/g, ' '))
          break
        } catch { /* Try an optional textual description; never parse or execute HTML. */ }
      }
      const image=thumbnailUrl(result.thumbnail_url,video.platform,video.identity)
      if(image)evidence.thumbnailUrl=image
      // Never execute oEmbed HTML/scripts or fetch image/author destinations on the server.
      // The approved platform exception permits unknown duration, not invented confirmation.
      // oEmbed does not prove short duration, game identity or content safety.
      return evidence
    } catch { return evidence }
  }
}
