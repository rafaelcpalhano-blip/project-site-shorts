import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { Short } from '../../shorts/types/models'
import { buildEmbed, tikTokMessage, commandTikTok } from '../services/embed'
import { playback } from '../services/playback'
import { audioPreference, createAudioObserver } from '../services/audio-preference'
import { loadYouTubeApi, applyYouTubeAudio } from '../services/youtube-api'
import type { YouTubePlayer } from '../services/youtube-api'
import styles from './OfficialPlayer.module.css'
import { VideoSourceLink } from './PlayerInformation'
export function OfficialPlayer({ short }: { short: Short }) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const iframe = useRef<HTMLIFrameElement>(null)
  const youtube = useRef<YouTubePlayer | null>(null)
  const expectAudio = useRef<(enabled: boolean) => void>(() => {})
  const tiktokReady = useRef(false)
  const audio = useSyncExternalStore(audioPreference.subscribe, audioPreference.getSnapshot, () => true)
  const [initialAudio, setInitialAudio] = useState(audioPreference.getSnapshot)
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
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element); measure()
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
    expectAudio.current = observeAudio.expect
    const fail = () => { setStatus('failed'); playback.release(id) }
    const timer = window.setTimeout(() => { if (!loaded.current) fail() }, 20000)
    const message = (event: MessageEvent) => {
      if (plan.platform !== 'TikTok') return
      const result = tikTokMessage(event, iframe.current?.contentWindow)
      if (result === 'error') fail()
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
          onError: () => { if (!disposed) fail() },
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
    return () => { expectAudio.current = () => {}; disposed = true; window.clearInterval(poll); youtube.current = null; tiktokReady.current = false;
      // Let React remove its own iframe. Destroy the API only after detaching it.
      if (apiPlayer) {
        const frame = apiFrame
        if (frame?.parentNode) { const holder = document.createElement('div'); frame.replaceWith(holder); apiPlayer.destroy(); holder.replaceWith(frame) }
        else apiPlayer.destroy()
      }
      window.clearTimeout(timer); window.clearTimeout(visibilityTimer); window.removeEventListener('message', message)
      document.removeEventListener('visibilitychange', visibility); visible.disconnect() }
  }, [active, id, plan.platform, plan.src, initialAudio])
  const chooseAudio = (enabled: boolean) => {
    expectAudio.current(enabled)
    audioPreference.set(enabled)
    if (plan.platform === 'YouTube' && youtube.current) {
      applyYouTubeAudio(youtube.current, enabled)
      if (enabled) youtube.current.playVideo()
    } else if (plan.platform === 'TikTok') {
      commandTikTok(iframe.current?.contentWindow, enabled ? 'unMute' : 'mute')
      if (enabled) commandTikTok(iframe.current?.contentWindow, 'play')
    } else if (plan.platform === 'Twitch') {
      // Clips have no interactive JS API: changing this explicit preference reloads the clip.
      loaded.current = false; setStatus('loading'); setInitialAudio(enabled)
    }
  }
  return <section className={styles.player} aria-label={'Vídeo · ' + short.platform}>
    <div ref={box} className={!short.url ? styles.unavailable : short.platform === 'Twitch' ? styles.wide : styles.vertical}>
      {active && plan.src ? <iframe ref={iframe} src={plan.src} title={short.title + ' · player oficial ' + plan.platform}
        width="100%" height="100%" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => { loaded.current = true; setStatus(current=>current==='blocked'?current:'ready') }}
        onError={() => { setStatus('failed'); playback.release(id) }} /> :
        <div className={styles.placeholder}>
          <p>{plan.reason || (status === 'failed' ? 'Não foi possível carregar o player. Tente novamente ou abra na fonte.' : 'Assista pelo player oficial de ' + plan.platform + '.')}</p>
          {plan.src && <button className="primary" onClick={() => {
            loaded.current = false; setStatus('loading'); playback.activate(id)
          }}>{status === 'failed' ? 'Tentar carregar novamente' : 'Retomar player'}</button>}
        </div>}
    </div>
    <div className={styles.links} data-short-interactions>
      <VideoSourceLink short={short} />
      {plan.src && <button type="button" className={styles.unavailableLink} onClick={() => { setStatus('failed'); playback.release(id) }}>Vídeo indisponível?</button>}
    </div>
    {active && <div className={styles.audioControls} data-short-interactions role="group" aria-label="Preferência de áudio da sessão">
      <button type="button" aria-pressed={audio} onClick={() => chooseAudio(!audio)}>{audio ? 'Preferir som: ligado' : 'Preferir som: desligado'}</button>
      {audio && plan.platform !== 'Twitch' && <button type="button" onClick={() => chooseAudio(true)}>Reproduzir com som</button>}
      <p>{plan.platform === 'Twitch' ? 'Nos clipes Twitch, use também o volume do player. Alterar a preferência aqui recarrega o clipe.' : 'A preferência vale para os próximos vídeos. O navegador pode exigir Play ou ativação do som no player.'}</p>
    </div>}
    <details className={styles.sound} data-short-interactions><summary>Sem som?</summary><p>Ative o som e ajuste o volume nos controles do player oficial. Se necessário, toque em Play: o navegador pode bloquear o início com áudio.</p></details>
    {active && status !== 'ready' && <p className={styles.status} role="status">{status === 'loading' ? 'Carregando player…' : status === 'blocked' ? 'A reprodução automática foi bloqueada. Use Reproduzir com som ou o Play do player oficial.' : status === 'audio-unavailable' ? 'O controle de áudio não carregou. Use os controles do player oficial.' : ''}</p>}
  </section>
}
