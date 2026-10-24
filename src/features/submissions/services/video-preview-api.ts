import {createVideoLinkClient} from './video-link-api.ts'
import { parseVideoUrl } from '../../../lib/validation/video-url.ts'
import { validateVideoTitle, validateChannelName } from '../../../lib/validation/public-input.ts'
export function createVideoPreviewClient(fetcher: typeof fetch = fetch) {
  return async (url: string, signal: AbortSignal): Promise<{title: string | null; channelName: string}> => {
    const video = parseVideoUrl(await createVideoLinkClient(fetcher)(url,signal))
    for (const path of ['/api/session', '/api/shorts/preview']) {
      const response = await fetcher(path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), headers: { 'Content-Type': 'application/json' },
        ...(path.endsWith('/preview') ? { body: JSON.stringify({ url: video.url }) } : {}),
      })
      if (!response.ok) throw new Error('Título original indisponível. Você pode informar um título; o vídeo será validado no envio.')
      if (path.endsWith('/preview')) {
        const result = await response.json()
        const channelName = validateChannelName(result?.channelName)
        if (video.platform === 'TikTok' && result?.title === null) return {title:null,channelName}
        return {title:validateVideoTitle(result?.title),channelName}
      }
    }
    throw new Error('Título indisponível.')
  }
}
