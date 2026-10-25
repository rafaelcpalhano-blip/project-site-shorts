import { PublicReadFailure, readFailureMessage } from '../../../lib/http/read-failure'
import { Link } from 'react-router-dom'
import { FirstCommentCelebration } from '../../comments/components/FirstCommentCelebration'
import { CommentSelectionModeration } from '../../admin/components/CommentSelectionModeration'
import { InlineModeration } from '../../admin/components/InlineModeration'
import { useAdminSession } from '../../admin/context/admin-session-context'
import styles from './FirestoreShortDialog.module.css'
import { LikeButton } from '../../likes/components/LikeButton'
import { PersistentCommentForm } from '../../comments/components/PersistentCommentForm'
import { ReportForm } from '../../reports/ReportForm'
import type {ReactNode} from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { PublicCursor, PublicComment } from '../../../lib/firebase/public-repository'
import type { Short } from '../types/models'
import { PlayerInformation } from '../../players/components/PlayerInformation'
import { OfficialPlayer } from '../../players/components/OfficialPlayer'
const repository = createPublicRepository(database)
export function FirestoreShortContent({ short, onLikeCount, onCommentCount, onModerated, onBusyChange, navigation }: { navigation?:ReactNode; short: Short; onCommentCount?:(id:string,count:number)=>void; onBusyChange:(busy:boolean)=>void; onLikeCount:(id:string,count:number)=>void;onModerated:()=>void }) {
  const admin=useAdminSession()
  const [selectingComments,setSelectingComments]=useState(false)
  const commentHeading=useRef<HTMLHeadingElement>(null)
  const [adminRequests,setAdminRequests]=useState<string[]>([])
  const adminBusy=adminRequests.length>0
  const adminBusyChange=useCallback((id:string,busy:boolean)=>setAdminRequests(current=>busy?[...current.filter(value=>value!==id),id]:current.filter(value=>value!==id)),[])
  const [liking,setLiking]=useState(false)
  const [available, setAvailable] = useState(false)
  const [confirmedOnce,setConfirmedOnce]=useState(false)
  const [commenting, setCommenting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [comments, setComments] = useState<PublicComment[]>([])
  const firstPublication=useRef<string|null>(null)
  const [celebration,setCelebration]=useState<string|null>(null)
  const [cursor, setCursor] = useState<PublicCursor>()
  const [next, setNext] = useState<PublicCursor | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const controller=new AbortController()
    repository.listComments(short.id, cursor, controller.signal).then(page => {
      if (!active) return
      if(firstPublication.current){if(page.items.some(item=>item.id===firstPublication.current))setCelebration(firstPublication.current);firstPublication.current=null}
      if(page.total!==undefined)onCommentCount?.(short.id,page.total)
      setConfirmedOnce(true); setAvailable(true); setComments(page.items); setNext(page.next); setLoading(false)
    }).catch(failure => { if (active) { setAvailable(false); setError(failure instanceof PublicReadFailure && failure.kind==='unavailable'?'Este vídeo não está mais disponível para comentários.':readFailureMessage(failure,'Não foi possível carregar os comentários. Tente novamente.')); setLoading(false) } })
    return () => { active = false; controller.abort() }
  }, [short.id, cursor, attempt, onCommentCount])
  useLayoutEffect(()=>{onBusyChange(reporting||commenting||liking||adminBusy||selectingComments);return()=>onBusyChange(false)},[onBusyChange,reporting,commenting,liking,adminBusy,selectingComments])
  return <>
    <OfficialPlayer key={'player:'+short.id} short={short} navigation={navigation} />
    <h2 className={styles.videoTitle}>{short.title}</h2>
    <div className={styles.interactions} data-short-interactions>
      <div className={styles.metadata}>
        <p className={styles.channel}>Nome do canal: <strong>{short.channelName?.trim() || 'Não informado'}</strong></p>
        <p className={styles.source}>Fonte: {short.platform}</p>
        <p className={styles.game}>Jogo: <Link to={'/jogos/'+short.gameId}>{short.gameName || 'Ver jogo'}</Link></p>
      </div>
      {available && <LikeButton key={'like:'+short.id} shortId={short.id} disabled={loading||!!error||adminBusy||selectingComments} onCountChange={onLikeCount} onBusyChange={setLiking} />}
    </div>
    <h3 ref={commentHeading} tabIndex={-1}>Comentários publicados</h3>
    {loading ? <p role="status">Carregando comentários...</p> : error ? <div role="alert"><p>{error}</p>
      <button disabled={commenting||adminBusy||selectingComments} onClick={() => { commentHeading.current?.focus(); setError(''); setLoading(true); setAttempt(value => value + 1) }}>Tentar novamente</button></div>
      : <CommentSelectionModeration key={short.id+attempt+(admin.user?.uid??'visitor')} shortId={short.id} comments={comments} disabled={liking||reporting||commenting||adminBusy} onSelectionChange={setSelectingComments} onBusyChange={adminBusyChange} onRemoved={ids=>{if(short.commentCount!==undefined&&short.commentCount>=ids.length)onCommentCount?.(short.id,short.commentCount-ids.length);setComments(current=>current.filter(item=>!ids.includes(item.id)));if(comments.every(item=>ids.includes(item.id)))commentHeading.current?.focus()}} />}
    {!loading && !error && next && <button disabled={adminBusy||selectingComments} onClick={() => { setLoading(true); setCursor(next) }}>Próximos comentários →</button>}
    {!confirmedOnce&&!loading&&error&&<p className="muted">O campo para comentar aparece após confirmarmos que os comentários estão disponíveis.</p>}
    {confirmedOnce && <PersistentCommentForm key={'comment-form:'+short.id} shortId={short.id} suspended={!available||loading||!!error} disabled={reporting || adminBusy || selectingComments} onBusyChange={setCommenting}
      onPublished={result => { firstPublication.current=result.firstPublished&&!result.repeated?result.id:null; setCursor(undefined); setError(''); setLoading(true); setAttempt(value => value + 1) }} />}
    {celebration && <FirstCommentCelebration key={celebration} />}
    <div className={styles.information} data-short-interactions>
      <PlayerInformation short={short} />
      {available && <details><summary>Sobre as curtidas do Clipzone</summary><p className="muted">Sua escolha fica vinculada à sessão deste navegador, sem cadastro obrigatório.</p></details>}
      {available && <ReportForm key={'report:'+short.id} shortId={short.id} disabled={loading||!!error||adminBusy||selectingComments} onBusyChange={setReporting} />}
    </div>
    {available&&admin.user&&<InlineModeration key={admin.user.uid+short.id} kind="short" id={short.id} disabled={loading||!!error||liking||reporting||commenting||adminBusy||selectingComments} onBusyChange={adminBusyChange} onCompleted={onModerated} />}
  </>
}
