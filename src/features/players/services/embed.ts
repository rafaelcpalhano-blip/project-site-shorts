import { parseVideoUrl } from '../../../lib/validation/video-url.ts'
export interface EmbedVideo { url?: string; platform: string; identity: string }
export interface EmbedEnvironment { origin: string; width: number; height: number; autoplay?: boolean; audioEnabled?: boolean }
export type EmbedPlan = { source?: string; platform?: string; src?: string; reason?: string }
export function buildEmbed(video: EmbedVideo, environment: EmbedEnvironment): EmbedPlan {
  if (!video.url) return { reason: 'Publicação ilustrativa, sem vídeo de origem.' }
  let parsed: ReturnType<typeof parseVideoUrl>
  try { parsed = parseVideoUrl(video.url) } catch { return { reason: 'O link de origem não é válido para as plataformas aceitas.' } }
  const result = { source: parsed.url, platform: parsed.platform }
  if (video.platform !== parsed.platform || video.identity !== parsed.identity) return { ...result, reason: 'Os dados deste vídeo não correspondem ao link da fonte.' }
  let origin: URL
  try { origin = new URL(environment.origin) } catch { return { ...result, reason: 'Não foi possível identificar o endereço deste site.' } }
  if (origin.protocol !== 'https:' || origin.origin !== environment.origin || origin.username || origin.password) {
    return { ...result, reason: 'A reprodução incorporada requer uma conexão HTTPS.' }
  }
  const minimumWidth = parsed.platform === 'Twitch' ? 400 : 200
  const minimumHeight = parsed.platform === 'Twitch' ? 300 : 200
  if (!Number.isFinite(environment.width) || !Number.isFinite(environment.height) || environment.width < minimumWidth || environment.height < minimumHeight) {
    return { ...result, reason: parsed.platform === 'Twitch' ?
      'Este espaço não comporta o player Twitch (mínimo de 400 × 300). Abra o vídeo na fonte ou use uma tela maior.' :
      'Este espaço é pequeno para os controles do player. Abra o vídeo na fonte ou use uma tela maior.' }
  }
  const id = parsed.identity.slice(parsed.platform.length + 1)
  if (parsed.platform === 'YouTube') {
    const url = new URL('https://www.youtube.com/embed/' + id)
    url.search = new URLSearchParams({ autoplay: environment.autoplay === true ? '1' : '0', controls: '1', playsinline: '1', loop: '0', enablejsapi: '1', origin: origin.origin }).toString()
    return { ...result, src: url.href }
  }
  if (parsed.platform === 'TikTok') {
    const url = new URL('https://www.tiktok.com/player/v1/' + id)
    url.search = new URLSearchParams({ autoplay: environment.autoplay === true ? '1' : '0', controls: '1', loop: '0', muted: '0', volume_control: '1', description: '1', music_info: '1', native_context_menu: '1' }).toString()
    return { ...result, src: url.href }
  }
  const url = new URL('https://clips.twitch.tv/embed')
  url.search = new URLSearchParams({ clip: id, parent: origin.hostname, autoplay: environment.autoplay === true ? 'true' : 'false', muted: environment.audioEnabled === false ? 'true' : 'false' }).toString()
  return { ...result, src: url.href }
}
export function tikTokMessage(event: { origin: string; source: unknown; data: unknown }, frameWindow: unknown): 'ready' | 'error' | 'autoplay-blocked' | 'muted' | 'unmuted' | 'playing' | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== 'https://www.tiktok.com' ||
      !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return null
  const data = event.data as Record<string, unknown>
  if (data['x-tiktok-player'] !== true) return null
  if (data.type === 'onMute' && typeof data.value === 'boolean') return data.value ? 'muted' : 'unmuted'
  if (data.type === 'onStateChange' && data.value === 1) return 'playing'
  if (data.type === 'onPlayerReady') return 'ready'
  if (data.type === 'onPlayerError' && data.value && typeof data.value === 'object' &&
      Number.isFinite((data.value as Record<string, unknown>).errorCode)) return (data.value as Record<string, unknown>).errorCode === 3002 ? 'autoplay-blocked' : 'error'
  if (data.type === 'onError' && typeof data.value === 'number' && Number.isFinite(data.value)) return 'error'
  return null
}

export function commandTikTok(frame: { postMessage(message: unknown, targetOrigin: string): void } | null | undefined, command: 'play' | 'mute' | 'unMute') {
  frame?.postMessage({ 'x-tiktok-player': true, type: command, value: undefined }, 'https://www.tiktok.com')
}
