import {useEffect,useId,useRef,useState} from 'react'
import {useAdminSession} from '../context/admin-session-context'
import {fetchDetail,sendReview,AdminRequestError} from '../services/moderation-api'
import type {ReviewDetail} from '../types/moderation'
import {fetchCommentDetail,sendCommentReview} from '../services/comment-moderation-api'
import type {CommentItem} from '../services/comment-moderation-api'
export function InlineModeration({kind,id,disabled,onCompleted,onBusyChange}:{kind:'short'|'comment';id:string;disabled:boolean;onCompleted:()=>void;onBusyChange:(id:string,busy:boolean)=>void}){
 const {user,authorized,invalidate}=useAdminSession(),field=useId(),active=useRef(true),lock=useRef(false)
 const reasonField=useRef<HTMLTextAreaElement>(null),removeButton=useRef<HTMLButtonElement>(null),blockButton=useRef<HTMLButtonElement>(null)
 const [action,setAction]=useState<'remove'|'block'|null>(null),[short,setShort]=useState<ReviewDetail|null>(null),[comment,setComment]=useState<CommentItem|null>(null)
 const [reason,setReason]=useState(''),[working,setWorking]=useState(false),[error,setError]=useState('')
 useEffect(()=>{active.current=true;return()=>{active.current=false;onBusyChange(field,false)}},[field,onBusyChange])
 useEffect(()=>{if(action&&authorized)reasonField.current?.focus()},[action,authorized])
 const run=async(work:()=>Promise<void>)=>{
  if(lock.current||disabled||!user||!authorized)return
  lock.current=true;setWorking(true);setError('');onBusyChange(field,true)
  try{await work()}catch(failure){if(active.current){if(failure instanceof AdminRequestError&&failure.unauthorized)invalidate('O acesso administrativo expirou ou foi revogado.');else setError(failure instanceof Error?failure.message:'Não foi possível concluir a decisão.')}}
  finally{lock.current=false;if(active.current){setWorking(false);onBusyChange(field,false)}}
 }
 if(!authorized||!user)return null
 const choose=(next:'remove'|'block')=>void run(async()=>{
  if(kind==='short'){const result=await fetchDetail(user,id);if(result.short.status!=='published')throw Error('O vídeo não está mais publicado. Atualize o feed.');if(active.current){setShort(result);setComment(null)}}
  else{const result=await fetchCommentDetail(user,id);if(result.comment.status!=='approved')throw Error('O comentário mudou. Atualize os comentários.');if(active.current){setComment(result.comment);setShort(null)}}
  if(active.current){setReason('');setAction(next)}
 })
 return <section aria-label={kind==='short'?'Moderação administrativa do vídeo':'Moderação administrativa do comentário'}>
  <div className="actions"><button ref={removeButton} type="button" disabled={disabled||working} onClick={()=>choose('remove')}>{kind==='short'?'Excluir vídeo':'Excluir'}</button>{kind==='short'&&<button ref={blockButton} type="button" disabled={disabled||working} onClick={()=>choose('block')}>Bloquear vídeo</button>}</div>
  {working&&<p role="status">Confirmando operação administrativa…</p>}{error&&<p role="alert" className="error">{error}</p>}
  {action&&<form className="form" aria-label="Confirmar decisão administrativa" onSubmit={event=>{event.preventDefault();void run(async()=>{
   if(reason.trim().length<5)return
   if(kind==='short'&&short)await sendReview(user,short,action,reason.trim())
   else if(kind==='comment'&&comment&&action==='remove')await sendCommentReview(user,comment,'remove',reason.trim())
   else throw Error('Reabra a decisão antes de confirmar.')
   if(active.current){setAction(null);onCompleted()}
  })}}>
   <p><strong>{action==='block'?'Tem certeza que deseja bloquear este vídeo?':kind==='short'?'Tem certeza que deseja excluir este short?':'Tem certeza que deseja excluir este comentário?'}</strong></p>
   <p>{action==='block'?'O vídeo ficará oculto na fila de revisão.':'O conteúdo será removido e poderá ser restaurado pela administração.'} A decisão será registrada no histórico.</p>
   <label htmlFor={field}>Motivo da decisão (5 a 500 caracteres)</label>
   <textarea ref={reasonField} id={field} required minLength={5} maxLength={500} value={reason} disabled={disabled||working} onChange={event=>setReason(event.target.value)} />
   <div className="actions"><button type="button" disabled={working} onClick={()=>{setAction(null);setReason('');(action==='block'?blockButton:removeButton).current?.focus()}}>Cancelar</button><button className="primary" disabled={disabled||working||reason.trim().length<5}>Confirmar {action==='block'?'bloqueio':'exclusão'}</button></div>
  </form>}
 </section>
}
