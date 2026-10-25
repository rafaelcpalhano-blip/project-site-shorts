export interface YouTubePlayer {
  unMute(): void
  mute(): void
  setVolume(volume: number): void
  getVolume(): number
  isMuted(): boolean
  playVideo(): void
  destroy(): void
}
export interface YouTubeApi {
  Player: new (frame: HTMLIFrameElement, options: { events: {
    onReady(event: { target: YouTubePlayer }): void
    onStateChange(event: { target: YouTubePlayer; data: number }): void
    onAutoplayBlocked(): void
    onError(event: {data:number}): void
  } }) => YouTubePlayer
}
type ApiWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void }
let pending: Promise<YouTubeApi> | undefined
export function loadYouTubeApi(): Promise<YouTubeApi> {
  const host = window as ApiWindow
  if (host.YT?.Player) return Promise.resolve(host.YT)
  if (pending) return pending
  pending = new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement('script')
    const previous = host.onYouTubeIframeAPIReady
    const cleanup = () => {
      window.clearTimeout(timer)
      if (host.onYouTubeIframeAPIReady === ready) host.onYouTubeIframeAPIReady = previous
      script.onerror = null
    }
    const fail = () => { cleanup(); script.remove(); pending = undefined; reject(new Error('YouTube API unavailable')) }
    const ready = () => {
      cleanup()
      if (host.YT?.Player) resolve(host.YT)
      else { pending = undefined; reject(new Error('YouTube API unavailable')) }
      previous?.()
    }
    const timer = window.setTimeout(fail, 15000)
    host.onYouTubeIframeAPIReady = ready
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = fail
    document.head.append(script)
  })
  return pending
}
export function applyYouTubeAudio(player: YouTubePlayer, enabled: boolean) {
  if (enabled) {
    // Preserve a positive provider volume; recover from volume zero without forcing 100%.
    if (player.getVolume() === 0) player.setVolume(50)
    player.unMute()
  } else player.mute()
}
