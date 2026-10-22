import { relativeTime } from '../../../lib/relative-time.ts'
import { validThumbnail } from '../../../lib/validation/thumbnail.ts'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Short } from '../types/models'

import styles from './ShortCard.module.css'
export function ShortCard({ short, count, gameName, onOpen }: { short: Short; count?: number; gameName?: string; onOpen: () => void }) {
  const game = { id: short.gameId, name: gameName || 'Jogo indisponível' }
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const [failedImage,setFailedImage]=useState('')
  const [loadedImage,setLoadedImage]=useState('')
  const thumbnail=validThumbnail(short.thumbnail,short.platform,short.identity,now)
  const image=thumbnail&&thumbnail.url!==failedImage?thumbnail.url:undefined
  const published=new Date(short.createdAt)
  const dateTime=Number.isSafeInteger(short.createdAt)&&short.createdAt>=0&&Number.isFinite(published.getTime())?published.toISOString():undefined
  return <article className={styles.card}>
    <button type="button" className={styles.preview} onClick={onOpen} aria-label={'Abrir vídeo: ' + short.title}>
      <span className={styles.platform}>{short.platform}</span>
      {image?<span className={styles.artwork}><img className={loadedImage===image?styles.loaded:undefined} src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={()=>setLoadedImage(image)} onError={()=>setFailedImage(image)} /></span>:<span className={styles.play} aria-hidden="true">▶</span>}
      <span className={styles.game}>{game.name}</span>
      {!image&&<span className={styles.caption}>{short.url?'Miniatura indisponível':'Prévia ilustrativa'}</span>}
    </button>
    <div className={styles.body}>
      <h3><button type="button" className={styles.title} onClick={onOpen}>{short.title}</button></h3>
      <p className={styles.channel}>{short.channelName || 'Canal não informado'}</p>
      <p className={styles.time}><time dateTime={dateTime}>{relativeTime(short.createdAt,now)}</time></p>
      {short.likeCount!==undefined&&<p aria-label={short.likeCount+' curtidas no Clipzone'}>♡ {short.likeCount}</p>}
      <button className={styles.comments} type="button" onClick={onOpen}>Comentários{count !== undefined ? ' (' + count + ')' : ''}</button>
      <Link className={styles.gameLink} to={'/jogos/' + game.id}>Ver jogo</Link>
    </div>
  </article>
}

