import {youtubeCardImage,unusableMediumImage,unusableMaxresImage} from '../services/youtube-card-image'
import {unavailableSources} from '../../../components/clipper/image-sources'
import { relativeTime } from '../../../lib/relative-time.ts'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Short } from '../types/models'
import { cardArtwork, failedCardImages } from '../services/card-artwork'
import styles from './ShortCard.module.css'
export function ShortCard({ short, count, gameName, onOpen, gameLinkState }: { gameLinkState?:unknown; short: Short; count?: number; gameName?: string; onOpen: () => void }) {
  const game = { id: short.gameId, name: gameName || short.gameName || 'Jogo indisponível' }
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const [,redraw]=useState(0)
  const [loadedImage,setLoadedImage]=useState('')
  const [missingMascot,setMissingMascot]=useState(false)
  const artwork=cardArtwork(short,now,failedCardImages.has)
  const optimized=artwork.kind==='thumbnail'&&short.platform==='YouTube'?youtubeCardImage(artwork.url,short.identity,failedCardImages.has):undefined
  const tooltipId=useId()
  const published=new Date(short.createdAt)
  const dateTime=Number.isSafeInteger(short.createdAt)&&short.createdAt>=0&&Number.isFinite(published.getTime())?published.toISOString():undefined
  return <article className={styles.card} data-short-id={short.id}>
    <button type="button" className={styles.preview} onClick={onOpen} aria-label={'Abrir vídeo: ' + short.title}>
      <span className={styles.platform}>{short.platform}</span>
      <span className={styles.artwork}>
        {artwork.kind==='clipper'&&<span className={styles.caption}>Miniatura indisponível</span>}
        {!(artwork.kind==='clipper'&&missingMascot)&&<img key={artwork.url} className={(artwork.kind==='clipper'?styles.mascot+' ':'')+(loadedImage===artwork.url?styles.loaded:'')} src={artwork.url} srcSet={artwork.kind==='clipper'?unavailableSources:optimized?.srcSet} sizes={artwork.kind==='clipper'?'144px':optimized?.sizes} alt={artwork.kind==='cover'?'Capa de '+game.name:artwork.kind==='clipper'?'Clipper com uma placa de alerta de imagem indisponível':''} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={event=>{const image=event.currentTarget;const medium=optimized&&image.currentSrc===optimized.medium;if(artwork.kind==='thumbnail'&&short.platform==='YouTube'&&(medium?unusableMediumImage(image.naturalWidth,image.naturalHeight):youtubeCardImage(artwork.url,short.identity,()=>false)&&unusableMaxresImage(image.naturalWidth,image.naturalHeight))){failedCardImages.add(medium?optimized.medium:artwork.url);redraw(value=>value+1);return}setLoadedImage(artwork.url)}} onError={event=>{if(optimized&&(!event.currentTarget.currentSrc||event.currentTarget.currentSrc===optimized.medium)){failedCardImages.add(optimized.medium);redraw(value=>value+1);return}if(artwork.kind==='clipper')setMissingMascot(true);else{failedCardImages.add(artwork.url);redraw(value=>value+1)}}} />}
      </span>
      <span className={styles.game} title={game.name}>{game.name}</span>
    </button>
    <div className={styles.body}>
      <h3 className={styles.titleArea}><button type="button" className={styles.title} onClick={onOpen} aria-describedby={tooltipId}><span>{short.title}</span></button><span id={tooltipId} role="tooltip" className={styles.tooltip}>{short.title}</span></h3>
      <p className={styles.channel} title={short.channelName}>{short.channelName || 'Canal não informado'}</p>
      <p className={styles.time}><time dateTime={dateTime}>{relativeTime(short.createdAt,now)}</time></p>
      <div className={styles.engagement}>
        {short.likeCount!==undefined&&<span aria-label={short.likeCount+' curtidas no Clipzone'}>♡ {short.likeCount}</span>}
        <button className={styles.comments} type="button" onClick={onOpen} aria-label={(count ?? short.commentCount) === undefined ? 'Abrir comentários; total indisponível' : (count ?? short.commentCount)+' comentários publicados'}>Comentários <span>{count ?? short.commentCount ?? '—'}</span></button>
      </div>
      <Link className={styles.gameLink} to={'/jogos/' + game.id} state={gameLinkState}>Ver jogo</Link>
    </div>
  </article>
}
