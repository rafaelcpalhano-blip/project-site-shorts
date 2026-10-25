import {PlayerFailure} from './PlayerFailure'
import {reportPlaybackFailure} from '../services/playback-failure-api'
import type {PlaybackSignal} from '../services/playback-failure-api'
import type {ReactNode} from 'react'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { Short } from '../../shorts/types/models'
import { buildEmbed, tikTokMessage, commandTikTok } from '../services/embed'
import { playback } from '../services/playback'
import { audioPreference, createAudioObserver } from '../services/audio-preference'
import { loadYouTubeApi, applyYouTubeAudio } from '../services/youtube-api'
import type { YouTubePlayer } from '../services/youtube-api'
import styles from './OfficialPlayer.module.css'
import { VideoSourceLink } from './PlayerInformation'
export function OfficialPlayer({ short, navigation }: { short: Short; navigation?:ReactNode }) {
  const id = useId()
  const [received,setReceived]=useState(false)
  const mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  const noteFailure=(signal:PlaybackSignal)=>{void reportPlaybackFailure(short.id,signal).then(ok=>{if(ok&&mounted.current)setReceived(true)})}
  const box = useRef<HTMLDivElement>(null)
  const scrollBox = useRef<HTMLDivElement>(null)
  const [horizontalScroll, setHorizontalScroll] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const youtube = useRef<YouTubePlayer | null>(null)
  const tiktokReady = useRef(false)
  const [initialAudio] = useState(audioPreference.getSnapshot)
  const loaded = useRef(false)
  const started = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'blocked' | 'audio-unavailable'>('loading')
  const owner = useSyncExternalStore(playback.subscribe, playback.getSnapshot, () => null)
  const plan = buildEmbed(short, { origin: typeof window==='undefined'?'':window.location.origin, ...size, autoplay: short.platform === 'Twitch' || initialAudio, audioEnabled: initialAudio })
  const active = owner === id && Boolean(plan.src)
  useEffect(() => {
    const element = box.current!
    const measure = () => {
      setSize(current => current.width === element.clientWidth && current.height === element.clientHeight ? current : { width: element.clientWidth, height: element.clientHeight })
      setHorizontalScroll(Boolean(scrollBox.current && element.offsetWidth > scrollBox.current.clientWidth))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element); if (scrollBox.current) observer.observe(scrollBox.current); measure()
    return () => { observer.disconnect(); playback.release(id) }
  }, [id])
  useEffect(() => {
    if (!plan.src) { playback.release(id); return }
    if (!started.current && !document.hidden) { started.current = true; playback.activate(id) }
  }, [id, plan.src])
  useEffect(() => {
    if (!active) return
    tiktokReady.current = false
    const observeAudio = createAudioObserver(audioPreference.set, audioPreference.getSnapshot())
    const fail = (signal:PlaybackSignal) => { setStatus('failed'); playback.release(id);void reportPlaybackFailure(short.id,signal).then(ok=>{if(ok&&mounted.current)setReceived(true)}) }
    const timer = window.setTimeout(() => { if (!loaded.current) fail('timeout') }, 20000)
    const message = (event: MessageEvent) => {
      if (plan.platform !== 'TikTok') return
      const result = tikTokMessage(event, iframe.current?.contentWindow)
      if (result === 'error') fail('tiktok-error')
      if (result === 'autoplay-blocked') { loaded.current = true; setStatus('blocked') }
      if (tiktokReady.current && (result === 'muted' || result === 'unmuted')) observeAudio(result === 'unmuted')
      if (result === 'playing') setStatus('ready')
      if (result === 'ready') { tiktokReady.current = true; commandTikTok(iframe.current?.contentWindow, audioPreference.getSnapshot() ? 'unMute' : 'mute'); if (!initialAudio) commandTikTok(iframe.current?.contentWindow, 'play'); loaded.current = true; setStatus(current => current === 'blocked' ? current : 'ready') }
    }
    let disposed = false
    let poll: number | undefined
    let firstPlaying = true
    let apiPlayer: YouTubePlayer | undefined
    const apiFrame = iframe.current
    if (plan.platform === 'YouTube' && iframe.current) {
      const frame = iframe.current
      loadYouTubeApi().then(api => {
        if (disposed || iframe.current !== frame) return
        apiPlayer = new api.Player(frame, { events: {
          onReady: event => {
            if (disposed) return
            youtube.current = event.target
            loaded.current = true
            applyYouTubeAudio(event.target, audioPreference.getSnapshot())
            if (!initialAudio) event.target.playVideo()
          },
          onStateChange: event => {
            if (disposed || event.data !== 1) return
            setStatus('ready')
            if (!firstPlaying) return
            firstPlaying = false
            // Some players restore native volume while entering PLAYING. Apply once
            // at that boundary, then observe; never fight later visitor changes.
            applyYouTubeAudio(event.target, audioPreference.getSnapshot())
            poll = window.setInterval(() => {
              if (!disposed && !document.hidden) {
                try { observeAudio(!event.target.isMuted() && event.target.getVolume() > 0) } catch { /* Player teardown. */ }
              }
            }, 750)
          },
          onAutoplayBlocked: () => { if (!disposed) setStatus('blocked') },
          onError: event => { if (!disposed) fail(([2,5,100,101,150,153].includes(event?.data)?'youtube-'+event.data:'network') as PlaybackSignal) },
        } })
      }).catch(() => { if (!disposed) setStatus('audio-unavailable') })
    }
    const visibility = () => { if (document.hidden) playback.release(id) }
    // The incoming slide can start just outside the clipped stage. Give it one transition to appear.
    let seenVisible = false
    const visible = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) seenVisible = true
        else if (seenVisible) playback.release(id)
      }
    })
    const visibilityTimer = window.setTimeout(() => { if (!seenVisible) playback.release(id) }, 350)
    visible.observe(box.current!)
    window.addEventListener('message', message)
    document.addEventListener('visibilitychange', visibility)
    return () => { disposed = true; window.clearInterval(poll); youtube.current = null; tiktokReady.current = false;
      // Let React remove its own iframe. Destroy the API only after detaching it.
      if (apiPlayer) {
        const frame = apiFrame
        if (frame?.parentNode) { const holder = document.createElement('div'); frame.replaceWith(holder); apiPlayer.destroy(); holder.replaceWith(frame) }
        else apiPlayer.destroy()
      }
      window.clearTimeout(timer); window.clearTimeout(visibilityTimer); window.removeEventListener('message', message)
      document.removeEventListener('visibilitychange', visibility); visible.disconnect() }
  }, [active, id, plan.platform, plan.src, initialAudio, short.id])
  const playerFrame = <div ref={box} className={status==='failed'?styles.failureFrame:!short.url ? styles.unavailable : short.platform === 'Twitch' ? styles.wide : styles.vertical}>
      {status==='failed'?<PlayerFailure shortId={short.id} received={received} onRetry={()=>{loaded.current=false;started.current=false;setStatus('loading');playback.activate(id)}}/>:active && plan.src ? <iframe ref={iframe} src={plan.src} title={short.title + ' · player oficial ' + plan.platform}
        width="100%" height="100%" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => { loaded.current = true; setStatus(current=>current==='blocked'?current:'ready') }}
        onError={() => { setStatus('failed'); playback.release(id);noteFailure('network') }} /> :
        <div className={styles.placeholder}>
          <p>{plan.reason || ('Assista pelo player oficial de ' + plan.platform + '.')}</p>
          {plan.src && <button className="primary" onClick={() => {
            loaded.current = false; setStatus('loading'); playback.activate(id)
          }}>Retomar player</button>}
        </div>}
    </div>
  return <section className={styles.player} aria-label={'Vídeo · ' + short.platform}>
    {short.platform === 'Twitch' ? <>
      <div ref={scrollBox} className={styles.twitchScroll} role="region" aria-label="Player Twitch" tabIndex={horizontalScroll ? 0 : undefined} data-short-interactions>{playerFrame}</div>
    </> : playerFrame}
    {navigation}
    <div className={styles.links} data-short-interactions>
      <VideoSourceLink short={short} />
      {plan.src && <button type="button" className={styles.unavailableLink} onClick={() => { setStatus('failed'); playback.release(id) }}>Vídeo indisponível?</button>}
    </div>
    {active && (status === 'loading' || status === 'blocked') && <p className={styles.status} role="status">{status === 'loading' ? 'Carregando player…' : status === 'blocked' ? 'A reprodução automática foi bloqueada. Use o Play do player oficial.' : ''}</p>}
  </section>
}
