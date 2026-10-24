import {useAdminListRefresh} from './use-admin-list-refresh'
import {AdminBulkSelect} from './AdminBulkSelect'
import {useAdminBulk} from '../context/admin-bulk-context'
import {AdminFilters} from './AdminFilters'
import {commentDescriptions} from './filter-descriptions'
import {AdminOrder} from './AdminOrder'
import type {AdminSort} from '../types/list-order'
import { RefreshButton } from './RefreshButton'
import { useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { AdminRequestError } from '../services/moderation-api'
import { fetchCommentQueue, fetchCommentDetail, sendCommentReview } from '../services/comment-moderation-api'
import type { CommentStatus, CommentAction, CommentDetail, CommentPage, CommentCursor, CommentFlag } from '../services/comment-moderation-api'
import styles from './ModerationPanel.module.css'
const statuses:Record<CommentStatus,string>={pending:'Pendentes',approved:'Publicados',rejected:'Rejeitados',removed:'Removidos'}
const actions:Record<CommentAction,string>={approve:'Publicar comentário',reject:'Rejeitar comentário',remove:'Remover comentário',restore:'Restaurar comentário'}
const flags:Record<string,string>={threat:'Possível ameaça',hate:'Possível discriminação','offensive-language':'Linguagem ofensiva',spam:'Possível spam'}
export function CommentModerationPanel({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}) {
  const bulk=useAdminBulk()
 const [sort,setSort]=useState<AdminSort>('date-desc')
 const [flag,setFlag]=useState<CommentFlag>('all')
 const [status,setStatus]=useState<CommentStatus>('pending')
  const [page,setPage]=useState<CommentPage|null>(null)
  const [history,setHistory]=useState<Array<CommentCursor|undefined>>([])
  const [detail,setDetail]=useState<CommentDetail|null>(null)
  const [reason,setReason]=useState('')
  const [action,setAction]=useState<CommentAction|null>(null)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const lock=useRef(false),active=useRef(true)
  useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
  const run=async(work:()=>Promise<void>,preserveFeedback=false)=>{
    if(lock.current||bulk?.busy)return
  bulk?.clear(preserveFeedback)
    lock.current=true;setWorking(true);setError('');if(!preserveFeedback)setMessage('')
    try{await work()}catch(failure){
      if(!active.current)return
      if(failure instanceof AdminRequestError&&failure.unauthorized){onUnauthorized();return}
      setError(failure instanceof Error?failure.message:'Não foi possível concluir a operação.')
    }finally{lock.current=false;if(active.current)setWorking(false)}
  }
  const load=async(cursor?:CommentCursor,selectedStatus:CommentStatus=status,selectedSort:AdminSort=sort,selectedFlag:CommentFlag=flag)=>{
    bulk?.clear(true);const result=await fetchCommentQueue(user,selectedStatus,cursor,selectedSort,selectedFlag)
    if(active.current){setPage(result);setDetail(null);setAction(null);setReason('')}
  }
  useAdminListRefresh(bulk?.revision,working||!!bulk?.busy,()=>{if(page)void run(async()=>{await load();setHistory([])},true)})
 return <section className={styles.panel} aria-labelledby="comment-review-heading">
    <h2 id="comment-review-heading">Moderação de comentários</h2>

    <p>A triagem local pode errar ou deixar passar conteúdo. Confira o contexto antes de decidir.</p>
    <AdminFilters labels={statuses} descriptions={commentDescriptions} value={status} disabled={working||!!bulk?.busy} onChange={value=>void run(async()=>{setStatus(value);setPage(null);setDetail(null);setHistory([]);setAction(null);setReason('');await load(undefined,value)})} order={<AdminOrder value={sort} disabled={working||!!bulk?.busy} textLabel="Texto" dateLabel="Data de criação do comentário" onChange={value=>void run(async()=>{setSort(value);setPage(null);setHistory([]);await load(undefined,status,value)})} />} refresh={<RefreshButton label="Atualizar comentários" disabled={working||!!bulk?.busy} onClick={()=>void run(async()=>{await load();if(active.current)setHistory([])})} />} />
    <label>Sinal da triagem <select value={flag} disabled={working||!!bulk?.busy} onChange={event=>{const value=event.target.value as CommentFlag;void run(async()=>{setFlag(value);setPage(null);setHistory([]);await load(undefined,status,sort,value)})}}><option value="all">Todos os sinais</option>{Object.entries(flags).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {page?.filteredWindow&&<p>O filtro percorre a fila em janelas de até 20 registros. Uma janela pode não conter correspondências; use Próximos comentários enquanto disponível.</p>}
    {working&&<p role="status">Consultando comentários…</p>}
    {error&&<p role="alert">{error}</p>}
    {message&&<p role="status">{message}</p>}
    {page&&<>
      {!page.items.length&&<p>Nenhum comentário nesta janela da fila.</p>}
      <ul className={styles.list}>{page.items.map(item=><li key={item.id}><AdminBulkSelect disabled={working} onChoose={()=>{setDetail(null);setAction(null)}} row={{kind:'comment',id:item.id,label:item.content,revision:item.revision,status:item.status}}/>
        <p style={{overflowWrap:'anywhere'}}>ID: {item.id}</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.content}</p>
        <button disabled={working||!!bulk?.busy} onClick={()=>void run(async()=>{
          const result=await fetchCommentDetail(user,item.id)
          if(active.current){setDetail(result);setAction(null);setReason('')}
        })}>Revisar comentário</button>
      </li>)}</ul>
      <div className={styles.actions}><button disabled={working||!!bulk?.busy||!history.length} onClick={()=>void run(async()=>{
        const previous=history.slice(0,-1);await load(previous.at(-1));if(active.current)setHistory(previous)
      })}>Comentários anteriores</button><span>Página {history.length+1} · até 20 itens</span>
      <button disabled={working||!!bulk?.busy||!page.next} onClick={()=>void run(async()=>{
        const next=page.next!;await load(next);if(active.current)setHistory([...history,next])
      })}>Próximos comentários</button></div>
    </>}
    {detail&&<article className={styles.detail}>
      <h3>Revisão do comentário</h3>
      <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{detail.comment.content}</p>
      <p>Vídeo: {detail.parent.title||'Indisponível'} · Estado do vídeo: {detail.parent.status}</p>
      <p>Estado do comentário: {statuses[detail.comment.status]} · {new Date(detail.comment.createdAt).toLocaleString('pt-BR')}</p>
      <p>Sinais: {detail.flags.map(value=>flags[value]||'Sinal desconhecido').join(', ')||'Nenhum sinal registrado'}</p>
      <h4>Últimas decisões</h4><ul>{detail.logs.map((log,index)=><li key={index}>{log.action} · {log.reason} · {new Date(log.createdAt).toLocaleString('pt-BR')}</li>)}</ul>
      <form className="form" onSubmit={event=>{
        event.preventDefault();if(!action)return
        void run(async()=>{
          await sendCommentReview(user,detail.comment,action,reason)
          if(active.current){setDetail(null);setHistory([]);setMessage('Decisão registrada.');bulk?.invalidateLists()}
        })
      }}>
        <label htmlFor="comment-review-reason">Motivo da decisão</label>
        <textarea id="comment-review-reason" minLength={5} maxLength={500} required value={reason}
          disabled={working||!!bulk?.busy} onChange={event=>setReason(event.target.value)} />
        <div className={styles.actions}>{(Object.keys(actions) as CommentAction[]).filter(value=>
          value==='approve'?['pending','rejected'].includes(detail.comment.status):
          value==='reject'?detail.comment.status==='pending':value==='remove'?detail.comment.status==='approved':detail.comment.status==='removed'
        ).map(value=><button key={value} type="button" disabled={working||!!bulk?.busy} aria-pressed={action===value} onClick={()=>setAction(value)}>{actions[value]}</button>)}</div>
        {action&&<p>Confirmar: {actions[action]}. A decisão será registrada no histórico.</p>}
        <button className="primary" disabled={working||!!bulk?.busy||!action||reason.trim().length<5} type="submit">Confirmar decisão do comentário</button>
      </form>
    </article>}
  </section>
}
