import {useAdminListRefresh} from './use-admin-list-refresh'
import {AdminBulkSelect} from './AdminBulkSelect'
import {useAdminBulk} from '../context/admin-bulk-context'
import {AdminFilters} from './AdminFilters'
import {queueDescriptions} from './filter-descriptions'
import {AdminOrder} from './AdminOrder'
import type {AdminSort} from '../types/list-order'
import { RefreshButton } from './RefreshButton'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { fetchQueue, fetchDetail, sendReview, AdminRequestError } from '../services/moderation-api'
import type { QueueCursor, QueuePage, ReviewDetail, ReviewAction } from '../types/moderation'
import { reportReasons } from '../../../lib/validation/report-input'
import { parseVideoUrl } from '../../../lib/validation/video-url'
import styles from './ModerationPanel.module.css'
const queueLabels = {reports:'Denúncias abertas',reviewed:'Denúncias analisadas',pending:'Todos os pendentes / bloqueados',unblocked:'Pendentes de publicação',blocked:'Bloqueados pela administração',removed:'Vídeos removidos'}
const date = (value: string) => new Date(value).toLocaleString('pt-BR')
const labels: Record<ReviewAction, string> = { block:'Bloquear vídeo', dismiss: 'Arquivar denúncias', approve: 'Publicar vídeo', remove: 'Remover vídeo', restore: 'Restaurar vídeo' }
export function ModerationPanel({ user, onUnauthorized,initialShortId }: { user: User; onUnauthorized: () => void;initialShortId?:string }) {
 const bulk=useAdminBulk()
  const [sort,setSort]=useState<AdminSort>('date-desc')
 const [queue, setQueue] = useState<keyof typeof queueLabels>('reports')
  const [page, setPage] = useState<QueuePage | null>(null)
  const [history, setHistory] = useState<Array<QueueCursor | undefined>>([])
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [reason, setReason] = useState('')
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [working, setWorking] = useState(Boolean(initialShortId))
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(Boolean(initialShortId))
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const initialUnauthorized=useEffectEvent(onUnauthorized)
  useEffect(()=>{if(!initialShortId)return;let disposed=false;void fetchDetail(user,initialShortId).then(result=>{if(!disposed)setDetail(result)}).catch(error=>{if(disposed)return;if(error instanceof AdminRequestError&&error.unauthorized)initialUnauthorized();else setError('Não foi possível abrir a revisão.')}).finally(()=>{if(!disposed){lock.current=false;setWorking(false)}});return()=>{disposed=true}},[user,initialShortId])
  const run = async (work: () => Promise<void>,preserveFeedback=false) => {
    if (lock.current||bulk?.busy) return
    bulk?.clear(preserveFeedback)
    lock.current = true; setWorking(true); setError(''); if(!preserveFeedback)setFeedback('')
    try { await work() }
    catch (failure) {
      if (!active.current) return
      if (failure instanceof AdminRequestError && failure.unauthorized) { onUnauthorized(); return }
      setError(failure instanceof Error ? failure.message : 'Operação indisponível. Tente novamente.')
    } finally { lock.current = false; if (active.current) setWorking(false) }
  }
  const load = async (selectedQueue: keyof typeof queueLabels = queue,selectedSort:AdminSort=sort) => {
    bulk?.clear(true);const result = await fetchQueue(user, selectedQueue,undefined,selectedSort)
    if (active.current) { setPage(result); setHistory([]); setDetail(null); setAction(null); setReason('') }
  }
  const open = async (id: string) => {
    const result = await fetchDetail(user, id)
    if (active.current) { setDetail(result); setAction(null); setReason('') }
  }
 useAdminListRefresh(bulk?.revision,working||!!bulk?.busy,()=>{if(page)void run(async()=>{await load();setHistory([])},true)})
  let source: string | undefined
  if (detail) {
    try { source = parseVideoUrl(detail.short.url).url } catch { /* Never link arbitrary schemes/hosts from stored data. */ }
  }
  return <section className={styles.panel} aria-labelledby="moderation-heading">
    <h2 id="moderation-heading">Denúncias e moderação de vídeos</h2>

    <p>Denúncias entram para análise e mantêm o vídeo visível. Os totais representam sessões anônimas, não pessoas verificadas.</p>
    <AdminFilters labels={queueLabels} descriptions={queueDescriptions} value={queue} disabled={working||!!bulk?.busy} onChange={value=>void run(async()=>{setQueue(value);setPage(null);setDetail(null);setHistory([]);setAction(null);setReason('');await load(value)})} order={<AdminOrder value={sort} disabled={working||!!bulk?.busy} textLabel="Título" dateLabel={queue==='reports'||queue==='reviewed'?'Data da primeira denúncia':'Data de criação do vídeo'} onChange={value=>void run(async()=>{setSort(value);setPage(null);setHistory([]);await load(queue,value)})} />} refresh={<RefreshButton label="Atualizar fila de denúncias e vídeos" disabled={working||!!bulk?.busy} onClick={() => void run(() => load())} />} />
    {page?.filteredWindow&&<p>Filtro em janelas de até 20 registros. Uma janela vazia pode ter continuação; use Próxima enquanto disponível.</p>}
    {working && <p role="status">Consultando o servidor…</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {feedback && <p role="status">{feedback}</p>}
    {page && <div>
      {!page.items.length && <p>Nenhum item nesta janela da fila.</p>}
      <ul className={styles.list}>{page.items.map(item => <li key={item.id}>{queue!=='reviewed'&&<AdminBulkSelect disabled={working} onChoose={()=>{setDetail(null);setAction(null)}} row={{kind:'video',id:item.id,label:item.title??'',status:item.status,queue:queue==='blocked'||queue==='unblocked'?'pending':queue,count:item.count,reviewedCount:item.reviewedCount}}/>}
        <div><strong>{item.title || 'Vídeo denunciado'}</strong><p style={{overflowWrap:'anywhere'}}>ID: {item.id}</p><p>{date(item.time)}{item.count !== undefined &&
          ' · ' + Math.max(0, item.count - (item.reviewedCount ?? 0)) + ' denúncia(s) desde a última análise'}</p></div>
        <button disabled={working||!!bulk?.busy} onClick={() => void run(() => open(item.id))}>Revisar</button>
      </li>)}</ul>
      <div className={styles.actions}>
        <button disabled={working||!!bulk?.busy || !history.length} onClick={() => void run(async () => {
          const previous = history.slice(0, -1)
          bulk?.clear(true);const result = await fetchQueue(user, queue, previous.at(-1),sort)
          if (active.current) { setPage(result); setHistory(previous); setDetail(null); setAction(null) }
        })}>Anterior</button>
        <span>Página {history.length + 1} · até 20 itens</span>
        <button disabled={working||!!bulk?.busy || !page.next} onClick={() => void run(async () => {
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
      {detail.next && <button disabled={working||!!bulk?.busy} onClick={() => void run(async () => {
        const result = await fetchDetail(user, detail.short.id, detail.next!)
        if (result.count !== detail.count || result.short.revision !== detail.short.revision) throw new Error('Há alterações recentes. Reabra os detalhes antes de decidir.')
        if (active.current) setDetail({ ...detail, reports: [...detail.reports, ...result.reports], next: result.next })
      })}>Mais denúncias deste vídeo</button>}
      <h4>Últimas 10 decisões registradas</h4>
      <ul>{detail.logs.map((log, index) => <li key={index}>{log.action} · {log.reason} · {date(log.createdAt)}</li>)}</ul>
      <p>Confira a fonte, o jogo, o título e o motivo. Combate fictício normal do jogo não equivale a violência real ou ameaça.</p>
      <label htmlFor="review-reason">Motivo da decisão (5 a 500 caracteres)</label>
      <textarea id="review-reason" className={styles.reason} minLength={5} maxLength={500} value={reason}
        disabled={working||!!bulk?.busy} onChange={event => { setReason(event.target.value); setAction(null) }} />
      <div className={styles.actions}>
        {detail.count > detail.reviewedCount && ['published', 'pending'].includes(detail.short.status) &&
          <button disabled={working||!!bulk?.busy || reason.trim().length < 5} onClick={() => setAction('dismiss')}>Arquivar denúncias</button>}
        {detail.short.status === 'published' && <button disabled={working||!!bulk?.busy || reason.trim().length < 5} onClick={()=>setAction('block')}>Bloquear vídeo</button>}
        {detail.short.status === 'pending' && <button disabled={working||!!bulk?.busy || reason.trim().length < 5} onClick={() => setAction('approve')}>Publicar vídeo</button>}
        {['published', 'pending'].includes(detail.short.status) &&
          <button disabled={working||!!bulk?.busy || reason.trim().length < 5} onClick={() => setAction('remove')}>Remover vídeo</button>}
        {detail.short.restoreStatus && <button disabled={working||!!bulk?.busy || reason.trim().length < 5} onClick={() => setAction('restore')}>Restaurar vídeo</button>}
      </div>
      {action && <div className={styles.confirm} role="group" aria-label="Confirmar decisão">
        <p><strong>{labels[action]}?</strong> {action==='block'?'O vídeo sairá da visualização pública e aparecerá em Bloqueados pela administração. Seu registro e identidade serão preservados.':action === 'remove' ? 'O vídeo sairá do feed e continuará bloqueado contra republicação.' :
          action === 'restore' ? 'O registro voltará ao estado anterior à remoção, sem nova cobrança de cota. O link continuará bloqueado para novos envios.' :
          action === 'approve' ? 'A fonte será validada novamente e a publicação consumirá a cota do autor de hoje.' : 'As denúncias serão marcadas como analisadas, preservando os registros. A visibilidade não será alterada. Novas denúncias poderão reabrir a análise.'}</p>
        <p>Motivo: {reason}</p>
        <div className={styles.actions}>
          <button className="primary" disabled={working||!!bulk?.busy} onClick={() => void run(async () => {
            await sendReview(user, detail, action, reason)
            if (!active.current) return
            setDetail(null); setAction(null); setReason(''); setHistory([])
            setFeedback('Decisão registrada.');bulk?.invalidateLists()
          })}>Confirmar decisão</button>
          <button disabled={working||!!bulk?.busy} onClick={() => setAction(null)}>Cancelar</button>
        </div>
      </div>}
    </article>}
  </section>
}
