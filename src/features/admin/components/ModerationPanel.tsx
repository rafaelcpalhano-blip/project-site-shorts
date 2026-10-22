import {AdminOrder} from './AdminOrder'
import type {AdminSort} from '../types/list-order'
import { RefreshButton } from './RefreshButton'
import { useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { fetchQueue, fetchDetail, sendReview, AdminRequestError } from '../services/moderation-api'
import type { QueueCursor, QueuePage, ReviewDetail, ReviewAction } from '../types/moderation'
import { reportReasons } from '../../../lib/validation/report-input'
import { parseVideoUrl } from '../../../lib/validation/video-url'
import styles from './ModerationPanel.module.css'
const date = (value: string) => new Date(value).toLocaleString('pt-BR')
const labels: Record<ReviewAction, string> = { block:'Bloquear vídeo', dismiss: 'Arquivar denúncias', approve: 'Publicar vídeo', remove: 'Remover vídeo', restore: 'Restaurar vídeo' }
export function ModerationPanel({ user, onUnauthorized }: { user: User; onUnauthorized: () => void }) {
  const [sort,setSort]=useState<AdminSort>('date-desc')
 const [queue, setQueue] = useState<'reports' | 'pending' | 'removed'>('reports')
  const [page, setPage] = useState<QueuePage | null>(null)
  const [history, setHistory] = useState<Array<QueueCursor | undefined>>([])
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [reason, setReason] = useState('')
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true; setWorking(true); setError(''); setFeedback('')
    try { await work() }
    catch (failure) {
      if (!active.current) return
      if (failure instanceof AdminRequestError && failure.unauthorized) { onUnauthorized(); return }
      setError(failure instanceof Error ? failure.message : 'Operação indisponível. Tente novamente.')
    } finally { lock.current = false; if (active.current) setWorking(false) }
  }
  const load = async (selectedQueue: 'reports' | 'pending' | 'removed' = queue,selectedSort:AdminSort=sort) => {
    const result = await fetchQueue(user, selectedQueue,undefined,selectedSort)
    if (active.current) { setPage(result); setHistory([]); setDetail(null); setAction(null); setReason('') }
  }
  const open = async (id: string) => {
    const result = await fetchDetail(user, id)
    if (active.current) { setDetail(result); setAction(null); setReason('') }
  }
  let source: string | undefined
  if (detail) {
    try { source = parseVideoUrl(detail.short.url).url } catch { /* Never link arbitrary schemes/hosts from stored data. */ }
  }
  return <section className={styles.panel} aria-labelledby="moderation-heading">
    <h2 id="moderation-heading">Denúncias e revisão</h2>
 <AdminOrder value={sort} disabled={working} textLabel="Título" dateLabel="Data de entrada na fila" onChange={value=>void run(async()=>{setSort(value);setPage(null);setHistory([]);await load(queue,value)})} />
    <p>Denúncias entram para análise e mantêm o vídeo visível. Os totais representam sessões anônimas, não pessoas verificadas.</p>
    <div className={styles.actions}>
      {(['reports', 'pending', 'removed'] as const).map(value => <button key={value} disabled={working} aria-pressed={queue === value} onClick={() => void run(async () => {
        setQueue(value); setPage(null); setDetail(null); setHistory([]); setAction(null); setReason('')
        await load(value)
      })}>{value === 'reports' ? 'Denúncias abertas' : value === 'pending' ? 'Vídeos pendentes / bloqueados' : 'Vídeos removidos'}</button>)}
      <RefreshButton label="Atualizar fila de denúncias e vídeos" disabled={working} onClick={() => void run(() => load())} />
    </div>
    {working && <p role="status">Consultando o servidor…</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {feedback && <p role="status">{feedback}</p>}
    {page && <div>
      {!page.items.length && <p>Nenhum item nesta fila.</p>}
      <ul className={styles.list}>{page.items.map(item => <li key={item.id}>
        <div><strong>{item.title || 'Vídeo denunciado'}</strong><p>{date(item.time)}{item.count !== undefined &&
          ' · ' + Math.max(0, item.count - (item.reviewedCount ?? 0)) + ' denúncia(s) desde a última análise'}</p></div>
        <button disabled={working} onClick={() => void run(() => open(item.id))}>Revisar</button>
      </li>)}</ul>
      <div className={styles.actions}>
        <button disabled={working || !history.length} onClick={() => void run(async () => {
          const previous = history.slice(0, -1)
          const result = await fetchQueue(user, queue, previous.at(-1),sort)
          if (active.current) { setPage(result); setHistory(previous); setDetail(null); setAction(null) }
        })}>Anterior</button>
        <span>Página {history.length + 1} · até 20 itens</span>
        <button disabled={working || !page.next} onClick={() => void run(async () => {
          const next = page.next!
          const result = await fetchQueue(user, queue, next,sort)
          if (active.current) { setPage(result); setHistory([...history, next]); setDetail(null); setAction(null) }
        })}>Próxima</button>
      </div>
    </div>}
    {detail && <article className={styles.detail} aria-labelledby="review-title">
      <h3 id="review-title">{detail.short.title}</h3>
      {detail.short.originalTitle && <p>Título na fonte: {detail.short.originalTitle}</p>}
      <p>Estado: {detail.short.status} · Plataforma: {detail.short.platform} · Jogo: {detail.short.gameId}</p>
      <p>{detail.count} denúncia(s) no total; {detail.reviewedCount} já analisada(s).</p>
      {source ? <a href={source} target="_blank" rel="noopener noreferrer">Abrir vídeo na fonte original ↗</a> : <p>Link original indisponível ou inválido.</p>}
      {detail.short.status === 'removed' && <p>{detail.short.restoreStatus ?
        'Restauração disponível para o estado original: ' + (detail.short.restoreStatus === 'published' ? 'publicado' : 'pendente') + '.' :
        'Sem histórico seguro para restauração. O registro permanece removido.'}</p>}
      {detail.short.blocked && <p>Bloqueado administrativamente. A liberação não consome novamente a cota do autor.</p>}
      <h4>Denúncias recebidas</h4>
      {!detail.reports.length && <p>Nenhuma denúncia registrada.</p>}
      <ul>{detail.reports.map((report, index) => <li key={index}>
        {reportReasons[report.reason as keyof typeof reportReasons] || 'Motivo desconhecido'} · {date(report.createdAt)}
      </li>)}</ul>
      {detail.next && <button disabled={working} onClick={() => void run(async () => {
        const result = await fetchDetail(user, detail.short.id, detail.next!)
        if (result.count !== detail.count || result.short.revision !== detail.short.revision) throw new Error('Há alterações recentes. Reabra os detalhes antes de decidir.')
        if (active.current) setDetail({ ...detail, reports: [...detail.reports, ...result.reports], next: result.next })
      })}>Mais denúncias deste vídeo</button>}
      <h4>Últimas 10 decisões registradas</h4>
      <ul>{detail.logs.map((log, index) => <li key={index}>{log.action} · {log.reason} · {date(log.createdAt)}</li>)}</ul>
      <p>Confira a fonte, o jogo, o título e o motivo. Combate fictício normal do jogo não equivale a violência real ou ameaça.</p>
      <label htmlFor="review-reason">Motivo da decisão (5 a 500 caracteres)</label>
      <textarea id="review-reason" className={styles.reason} minLength={5} maxLength={500} value={reason}
        disabled={working} onChange={event => { setReason(event.target.value); setAction(null) }} />
      <div className={styles.actions}>
        {detail.count > detail.reviewedCount && ['published', 'pending'].includes(detail.short.status) &&
          <button disabled={working || reason.trim().length < 5} onClick={() => setAction('dismiss')}>Arquivar denúncias</button>}
        {detail.short.status === 'published' && <button disabled={working || reason.trim().length < 5} onClick={()=>setAction('block')}>Bloquear vídeo</button>}
        {detail.short.status === 'pending' && <button disabled={working || reason.trim().length < 5} onClick={() => setAction('approve')}>Publicar vídeo</button>}
        {['published', 'pending'].includes(detail.short.status) &&
          <button disabled={working || reason.trim().length < 5} onClick={() => setAction('remove')}>Remover vídeo</button>}
        {detail.short.restoreStatus && <button disabled={working || reason.trim().length < 5} onClick={() => setAction('restore')}>Restaurar vídeo</button>}
      </div>
      {action && <div className={styles.confirm} role="group" aria-label="Confirmar decisão">
        <p><strong>{labels[action]}?</strong> {action==='block'?'O vídeo ficará oculto na fila de revisão, mantendo sua identidade reservada.':action === 'remove' ? 'O vídeo sairá do feed e continuará bloqueado contra republicação.' :
          action === 'restore' ? 'O registro voltará ao estado anterior à remoção, sem nova cobrança de cota. O link continuará bloqueado para novos envios.' :
          action === 'approve' ? 'A fonte será validada novamente e a publicação consumirá a cota do autor de hoje.' : 'A visibilidade não será alterada. Novas denúncias reabrirão a análise.'}</p>
        <p>Motivo: {reason}</p>
        <div className={styles.actions}>
          <button className="primary" disabled={working} onClick={() => void run(async () => {
            await sendReview(user, detail, action, reason)
            if (!active.current) return
            setDetail(null); setAction(null); setReason(''); setPage(null); setHistory([])
            setFeedback('Decisão registrada. Use o botão de atualização para recarregar a fila.')
          })}>Confirmar decisão</button>
          <button disabled={working} onClick={() => setAction(null)}>Cancelar</button>
        </div>
      </div>}
    </article>}
  </section>
}
