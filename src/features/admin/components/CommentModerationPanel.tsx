import { useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { AdminRequestError } from '../services/moderation-api'
import { fetchCommentQueue, fetchCommentDetail, sendCommentReview } from '../services/comment-moderation-api'
import type { CommentStatus, CommentAction, CommentDetail, CommentPage, CommentCursor } from '../services/comment-moderation-api'
import styles from './ModerationPanel.module.css'
const statuses:Record<CommentStatus,string>={pending:'Pendentes',approved:'Publicados',rejected:'Rejeitados',removed:'Removidos'}
const actions:Record<CommentAction,string>={approve:'Publicar comentário',reject:'Rejeitar comentário',remove:'Remover comentário',restore:'Restaurar comentário'}
const flags:Record<string,string>={threat:'Possível ameaça',hate:'Possível discriminação','offensive-language':'Linguagem ofensiva',spam:'Possível spam'}
export function CommentModerationPanel({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}) {
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
  const run=async(work:()=>Promise<void>)=>{
    if(lock.current)return
    lock.current=true;setWorking(true);setError('');setMessage('')
    try{await work()}catch(failure){
      if(!active.current)return
      if(failure instanceof AdminRequestError&&failure.unauthorized){onUnauthorized();return}
      setError(failure instanceof Error?failure.message:'Não foi possível concluir a operação.')
    }finally{lock.current=false;if(active.current)setWorking(false)}
  }
  const load=async(cursor?:CommentCursor)=>{
    const result=await fetchCommentQueue(user,status,cursor)
    if(active.current){setPage(result);setDetail(null);setAction(null);setReason('')}
  }
  return <section className={styles.panel} aria-labelledby="comment-review-heading">
    <h2 id="comment-review-heading">Comentários e revisão de texto</h2>
    <p>A triagem local pode errar ou deixar passar conteúdo. Confira o contexto antes de decidir.</p>
    <div className={styles.actions}>{(Object.keys(statuses) as CommentStatus[]).map(value=><button key={value} disabled={working}
      aria-pressed={status===value} onClick={()=>{setStatus(value);setPage(null);setDetail(null);setHistory([]);setAction(null);setError('');setMessage('')}}>
      {statuses[value]}</button>)}
      <button disabled={working} onClick={()=>void run(async()=>{await load();if(active.current)setHistory([])})}>{page?'Atualizar comentários':'Carregar comentários'}</button>
    </div>
    {working&&<p role="status">Consultando comentários…</p>}
    {error&&<p role="alert">{error}</p>}
    {message&&<p role="status">{message}</p>}
    {page&&<>
      {!page.items.length&&<p>Nenhum comentário nesta fila.</p>}
      <ul className={styles.list}>{page.items.map(item=><li key={item.id}>
        <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.content}</p>
        <button disabled={working} onClick={()=>void run(async()=>{
          const result=await fetchCommentDetail(user,item.id)
          if(active.current){setDetail(result);setAction(null);setReason('')}
        })}>Revisar comentário</button>
      </li>)}</ul>
      <div className={styles.actions}><button disabled={working||!history.length} onClick={()=>void run(async()=>{
        const previous=history.slice(0,-1);await load(previous.at(-1));if(active.current)setHistory(previous)
      })}>Comentários anteriores</button><span>Página {history.length+1} · até 20 itens</span>
      <button disabled={working||!page.next} onClick={()=>void run(async()=>{
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
          await load()
          if(active.current){setHistory([]);setMessage('Decisão registrada.')}
        })
      }}>
        <label htmlFor="comment-review-reason">Motivo da decisão</label>
        <textarea id="comment-review-reason" minLength={5} maxLength={500} required value={reason}
          disabled={working} onChange={event=>setReason(event.target.value)} />
        <div className={styles.actions}>{(Object.keys(actions) as CommentAction[]).filter(value=>
          value==='approve'?['pending','rejected'].includes(detail.comment.status):
          value==='reject'?detail.comment.status==='pending':value==='remove'?detail.comment.status==='approved':detail.comment.status==='removed'
        ).map(value=><button key={value} type="button" disabled={working} aria-pressed={action===value} onClick={()=>setAction(value)}>{actions[value]}</button>)}</div>
        {action&&<p>Confirmar: {actions[action]}. A decisão será registrada no histórico.</p>}
        <button className="primary" disabled={working||!action||reason.trim().length<5} type="submit">Confirmar decisão do comentário</button>
      </form>
    </article>}
  </section>
}
