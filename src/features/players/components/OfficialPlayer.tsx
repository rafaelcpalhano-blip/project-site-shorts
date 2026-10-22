import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { Short } from '../../shorts/types/models'
import { buildEmbed, tikTokMessage } from '../services/embed'
import { playback } from '../services/playback'
import styles from './OfficialPlayer.module.css'
export function OfficialPlayer({ short }: { short: Short }) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const iframe = useRef<HTMLIFrameElement>(null)
  const loaded = useRef(false)
  const started = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'blocked'>('loading')
  const owner = useSyncExternalStore(playback.subscribe, playback.getSnapshot, () => null)
  const plan = buildEmbed(short, { origin: typeof window==='undefined'?'':window.location.origin, ...size, autoplay: true })
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
    const fail = () => { setStatus('failed'); playback.release(id) }
    const timer = window.setTimeout(() => { if (!loaded.current) fail() }, 20000)
    const message = (event: MessageEvent) => {
      if (plan.platform !== 'TikTok') return
      const result = tikTokMessage(event, iframe.current?.contentWindow)
      if (result === 'error') fail()
      if (result === 'autoplay-blocked') { loaded.current = true; setStatus('blocked') }
      if (result === 'ready') { loaded.current = true; setStatus(current => current === 'blocked' ? current : 'ready') }
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
    return () => { window.clearTimeout(timer); window.clearTimeout(visibilityTimer); window.removeEventListener('message', message)
      document.removeEventListener('visibilitychange', visibility); visible.disconnect() }
  }, [active, id, plan.platform])
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
    {active && <div className={styles.actions}>
      <p role="status">{status === 'loading' ? 'Carregando player…' : status === 'blocked' ? 'A reprodução automática foi bloqueada. Use o Play do player oficial.' : 'Se o vídeo não iniciar, use o Play do player oficial.'}</p>
      <button onClick={() => playback.release(id)}>Encerrar player</button>
      <button onClick={() => { setStatus('failed'); playback.release(id) }}>Vídeo indisponível?</button>
    </div>}
  </section>
}
