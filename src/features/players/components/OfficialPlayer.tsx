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
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const owner = useSyncExternalStore(playback.subscribe, playback.getSnapshot, () => null)
  const plan = buildEmbed(short, { origin: window.location.origin, ...size })
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
  useEffect(() => { if (!plan.src) playback.release(id) }, [id, plan.src])
  useEffect(() => {
    if (!active) return
    const fail = () => { setStatus('failed'); playback.release(id) }
    const timer = window.setTimeout(() => { if (!loaded.current) fail() }, 20000)
    const message = (event: MessageEvent) => {
      if (plan.platform !== 'TikTok') return
      const result = tikTokMessage(event, iframe.current?.contentWindow)
      if (result === 'error') fail()
      if (result === 'ready') { loaded.current = true; setStatus('ready') }
    }
    const visibility = () => { if (document.hidden) playback.release(id) }
    const visible = new IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting)) playback.release(id)
    })
    visible.observe(box.current!)
    window.addEventListener('message', message)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.clearTimeout(timer); window.removeEventListener('message', message)
      document.removeEventListener('visibilitychange', visibility); visible.disconnect() }
  }, [active, id, plan.platform])
  return <section className={styles.player} aria-label={'Vídeo · ' + short.platform}>
    <div ref={box} className={!short.url ? styles.unavailable : short.platform === 'Twitch' ? styles.wide : styles.vertical}>
      {active && plan.src ? <iframe ref={iframe} src={plan.src} title={short.title + ' · player oficial ' + plan.platform}
        width="100%" height="100%" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => { loaded.current = true; setStatus('ready') }}
        onError={() => { setStatus('failed'); playback.release(id) }} /> :
        <div className={styles.placeholder}>
          <p>{plan.reason || (status === 'failed' ? 'Não foi possível carregar o player. Tente novamente ou abra na fonte.' : 'Assista pelo player oficial de ' + plan.platform + '.')}</p>
          {plan.src && <button className="primary" onClick={() => {
            loaded.current = false; setStatus('loading'); playback.activate(id)
          }}>{status === 'failed' ? 'Tentar carregar novamente' : 'Carregar player'}</button>}
        </div>}
    </div>
    {active && <div className={styles.actions}>
      <p role="status">{status === 'loading' ? 'Carregando player…' : 'Use o botão de reprodução do player oficial.'}</p>
      <button onClick={() => playback.release(id)}>Encerrar player</button>
      <button onClick={() => { setStatus('failed'); playback.release(id) }}>Vídeo indisponível?</button>
    </div>}
    {plan.source && <p><a href={plan.source} target="_blank" rel="noopener noreferrer">Assistir na plataforma ↗</a></p>}
    {plan.src && <p className="muted">Ao carregar, você se conecta a {plan.platform}. Reprodução, cookies e eventuais restrições são tratados pela plataforma. Vídeos privados, removidos ou restritos podem não estar disponíveis aqui.</p>}
  </section>
}
