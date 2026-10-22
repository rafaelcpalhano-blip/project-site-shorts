import { createMetadataVerifier } from './verify.ts'
import { createTikTokVerifier } from './tiktok.ts'
import { createYouTubeVerifier, createYouTubeOEmbedVerifier } from './youtube.ts'
import type { VideoEvidence } from '../submissions/decision.ts'
export function createConfiguredVideoVerifier(options: {
  twitch?: (submission: { url: string; gameId: string }) => Promise<VideoEvidence>
  youtubeApiKey?: string
  fetcher?: typeof fetch
}) {
  const fetcher = options.fetcher ?? fetch
  const key = options.youtubeApiKey?.trim()
  return createMetadataVerifier({
    ...(options.twitch ? { Twitch: options.twitch } : {}),
    // oEmbed supplies optional public metadata: unknown shortFormat cannot authorize publication.
    YouTube: key ? createYouTubeVerifier({ apiKey: key, fetcher }) : createYouTubeOEmbedVerifier(fetcher),
    TikTok: createTikTokVerifier(fetcher),
  })
}
