import { parseVideoUrl } from '../../src/lib/validation/video-url.ts'
import type { VideoEvidence } from '../submissions/decision.ts'
interface Options {
  clientId: string
  accessToken: () => Promise<string>
  // Optional informational enrichment, never a publication requirement.
  twitchGameId?: (gameId: string) => Promise<string | null>
  fetcher?: typeof fetch
}
const unknown = (): VideoEvidence => ({ existence: 'unknown', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] })
export function createTwitchClipVerifier(options: Options) {
  if (!options.clientId) throw new Error('Twitch client ID required')
  const fetcher = options.fetcher ?? fetch
  return async (submission: { url: string; gameId: string }): Promise<VideoEvidence> => {
    const evidence = unknown()
    try {
      const video = parseVideoUrl(submission.url)
      if (video.platform !== 'Twitch') return evidence
      const id = video.identity.slice('Twitch:'.length)
      const endpoint = new URL('https://api.twitch.tv/helix/clips')
      endpoint.searchParams.set('id', id)
      const token = await options.accessToken()
      if (!token) return evidence
      const response = await fetcher(endpoint, { headers: { 'Client-ID': options.clientId, Authorization: 'Bearer ' + token },
        redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) return evidence
      const result = await response.json()
      if (!result || !Array.isArray(result.data)) return evidence
      if (result.data.length === 0) return { ...evidence, existence: 'missing' }
      // Unexpected identities or malformed responses are not proof of absence.
      if (result.data.length !== 1 || result.data[0]?.id !== id) return evidence
      const clip = result.data[0]
      evidence.existence = 'confirmed'
      if (typeof clip.duration === 'number' && Number.isFinite(clip.duration) && clip.duration > 0) evidence.shortFormat = 'confirmed'
      if (typeof clip.title === 'string' && clip.title.trim() && clip.title.length <= 500 &&
          ![...clip.title].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) evidence.title = clip.title.trim()
      const expected = await options.twitchGameId?.(submission.gameId)
      if (expected && /^[1-9]\d*$/.test(expected) && typeof clip.game_id === 'string' && /^[1-9]\d*$/.test(clip.game_id)) {
        evidence.gameMatch = expected === clip.game_id ? 'confirmed' : 'mismatch'
      }
      // Category and title metadata do not analyze video/audio or prove embed availability.
      // Moderation remains unavailable; this does not imply an audiovisual safety verdict.
      return evidence
    } catch { return evidence }
  }
}
