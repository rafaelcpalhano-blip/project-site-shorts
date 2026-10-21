export function parseVideoUrl(value: string) {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new Error('Informe um link válido.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Use um link HTTPS oficial, sem credenciais ou porta personalizada.')
  }
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/$/, '')
  let id: string | undefined
  let platform: string | undefined
  let canonical: string | undefined
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    id = path.match(/^\/shorts\/([\w-]{11})$/)?.[1]
    if (id) { platform = 'YouTube'; canonical = 'https://www.youtube.com/shorts/' + id }
  }
  if (['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(host)) {
    const match = path.match(/^\/@([\w.-]+)\/video\/(\d+)$/)
    if (match) { id = match[2]; platform = 'TikTok'; canonical = 'https://www.tiktok.com/@' + match[1] + '/video/' + id }
  }
  if (['clips.twitch.tv', 'www.twitch.tv', 'twitch.tv'].includes(host)) {
    id = host === 'clips.twitch.tv'
      ? path.match(/^\/([\w-]+)$/)?.[1]
      : path.match(/^\/[^/]+\/clip\/([\w-]+)$/)?.[1]
    if (id) { platform = 'Twitch'; canonical = 'https://clips.twitch.tv/' + id }
  }
  if (!id || !platform || !canonical) {
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
      throw new Error('Use o link https://www.youtube.com/shorts/ID. Abra o Short e copie o link no menu Compartilhar; links /watch e youtu.be não são aceitos.')
    }
    throw new Error('Use um link completo de YouTube Shorts, TikTok (/video/) ou Twitch Clips. Links encurtados não são resolvidos neste protótipo.')
  }
  return { identity: platform + ':' + id, platform, url: canonical }
}

