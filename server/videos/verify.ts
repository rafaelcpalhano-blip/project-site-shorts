import { parseVideoUrl } from '../../src/lib/validation/video-url.ts'
import type { VideoEvidence } from '../submissions/decision.ts'
type MetadataVerifier = (submission: { url: string; gameId: string }) => Promise<VideoEvidence>
type Adapters = Partial<Record<'YouTube' | 'Twitch' | 'TikTok', MetadataVerifier>>
// Suitable for SubmissionDependencies.verify; actual adapters must be configured by the server.
export function createMetadataVerifier(adapters: Adapters) {
  return async (submission: { url: string; gameId: string }): Promise<VideoEvidence> => {
    const unknown: VideoEvidence = { existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] }
    try {
      const video = parseVideoUrl(submission.url)
      const adapter = adapters[video.platform as keyof Adapters]
      if (!adapter) return unknown
      const evidence = await adapter({ url: video.url, gameId: submission.gameId })
      // Metadata never clears audiovisual moderation, even if an adapter mistakenly says so.
      return { ...evidence, moderation: 'unavailable' }
    } catch { return unknown }
  }
}
