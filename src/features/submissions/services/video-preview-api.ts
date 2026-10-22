import { parseVideoUrl } from '../../../lib/validation/video-url.ts'
import { validateVideoTitle } from '../../../lib/validation/public-input.ts'
export function createVideoPreviewClient(fetcher: typeof fetch = fetch) {
  return async (url: string, signal: AbortSignal): Promise<string | null> => {
    const video = parseVideoUrl(url)
    for (const path of ['/api/session', '/api/shorts/preview']) {
      const response = await fetcher(path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), headers: { 'Content-Type': 'application/json' },
        ...(path.endsWith('/preview') ? { body: JSON.stringify({ url: video.url }) } : {}),
      })
      if (!response.ok) throw new Error('Título original indisponível. Você pode informar um título; o vídeo será validado no envio.')
      if (path.endsWith('/preview')) {
        const result = await response.json()
        if (video.platform === 'TikTok' && result?.title === null) return null
        return validateVideoTitle(result?.title)
      }
    }
    throw new Error('Título indisponível.')
  }
}
