import { CommentSelectionModeration } from '../../admin/components/CommentSelectionModeration'
import { InlineModeration } from '../../admin/components/InlineModeration'
import { useAdminSession } from '../../admin/context/admin-session-context'
import styles from './FirestoreShortDialog.module.css'
import { LikeButton } from '../../likes/components/LikeButton'
import { PersistentCommentForm } from '../../comments/components/PersistentCommentForm'
import { ReportForm } from '../../reports/ReportForm'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { PublicCursor, PublicComment } from '../../../lib/firebase/public-repository'
import type { Short } from '../types/models'
import { OfficialPlayer } from '../../players/components/OfficialPlayer'
const repository = createPublicRepository(database)
export function FirestoreShortContent({ short, onLikeCount, onModerated, onBusyChange }: { short: Short; onBusyChange:(busy:boolean)=>void; onLikeCount:(id:string,count:number)=>void;onModerated:()=>void }) {
  const admin=useAdminSession()
  const [selectingComments,setSelectingComments]=useState(false)
  const commentHeading=useRef<HTMLHeadingElement>(null)
  const [adminRequests,setAdminRequests]=useState<string[]>([])
  const adminBusy=adminRequests.length>0
  const adminBusyChange=useCallback((id:string,busy:boolean)=>setAdminRequests(current=>busy?[...current.filter(value=>value!==id),id]:current.filter(value=>value!==id)),[])
  const [liking,setLiking]=useState(false)
  const [available, setAvailable] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [comments, setComments] = useState<PublicComment[]>([])
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
      setAvailable(true); setComments(page.items); setNext(page.next); setLoading(false)
    }).catch(() => { if (active) { setAvailable(false); setError('Não foi possível carregar os comentários. Tente novamente.'); setLoading(false) } })
    return () => { active = false; controller.abort() }
  }, [short.id, cursor, attempt])
  useLayoutEffect(()=>{onBusyChange(reporting||commenting||liking||adminBusy||selectingComments);return()=>onBusyChange(false)},[onBusyChange,reporting,commenting,liking,adminBusy,selectingComments])
  return <>
    <OfficialPlayer key={'player:'+short.id} short={short} />
    {available && <fieldset className={styles.interactions} data-short-interactions aria-label="Interações com o short" disabled={adminBusy||selectingComments}>
    <LikeButton key={'like:'+short.id} shortId={short.id} onCountChange={onLikeCount} onBusyChange={setLiking} />
    <ReportForm key={'report:'+short.id} shortId={short.id} onBusyChange={setReporting} />
    </fieldset>}
    <h3 ref={commentHeading} tabIndex={-1}>Comentários publicados</h3>
    {loading ? <p role="status">Carregando comentários...</p> : error ? <div role="alert"><p>{error}</p>
      <button disabled={adminBusy||selectingComments} onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1) }}>Tentar novamente</button></div>
      : <CommentSelectionModeration key={short.id+attempt+(admin.user?.uid??'visitor')} shortId={short.id} comments={comments} disabled={liking||reporting||commenting||adminBusy} onSelectionChange={setSelectingComments} onBusyChange={adminBusyChange} onRemoved={ids=>{setComments(current=>current.filter(item=>!ids.includes(item.id)));if(comments.every(item=>ids.includes(item.id)))commentHeading.current?.focus()}} />}
    {!loading && !error && next && <button disabled={adminBusy||selectingComments} onClick={() => { setLoading(true); setCursor(next) }}>Próximos comentários →</button>}
    <button disabled={loading || commenting || adminBusy || selectingComments} onClick={() => { setCursor(undefined); setError(''); setLoading(true); setAttempt(value => value + 1) }}>Atualizar comentários</button>
    {available && <PersistentCommentForm key={'comment-form:'+short.id} shortId={short.id} disabled={reporting || adminBusy || selectingComments} onBusyChange={setCommenting}
      onPublished={() => { setCursor(undefined); setError(''); setLoading(true); setAttempt(value => value + 1) }} />}
    {available&&admin.user&&<InlineModeration key={admin.user.uid+short.id} kind="short" id={short.id} disabled={liking||reporting||commenting||adminBusy||selectingComments} onBusyChange={adminBusyChange} onCompleted={onModerated} />}
  </>
}
