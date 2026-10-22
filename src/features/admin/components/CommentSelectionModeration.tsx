import { CommentContent } from '../../comments/components/CommentContent'
import {useEffect,useId,useRef,useState} from 'react'
import type {PublicComment} from '../../../lib/firebase/public-repository'
import {useAdminSession} from '../context/admin-session-context'
import {AdminRequestError} from '../services/moderation-api'
import {fetchCommentDetail,sendCommentReview} from '../services/comment-moderation-api'
import {removeSelectedComments} from '../services/remove-selected-comments'
import styles from './CommentSelectionModeration.module.css'
export function CommentSelectionModeration({shortId,comments,disabled,onSelectionChange,onBusyChange,onRemoved}:{shortId:string;comments:PublicComment[];disabled:boolean;onSelectionChange:(value:boolean)=>void;onBusyChange:(id:string,busy:boolean)=>void;onRemoved:(ids:string[])=>void}){
 const {user,authorized,invalidate}=useAdminSession(),field=useId(),active=useRef(true),lock=useRef(false),trigger=useRef<HTMLButtonElement>(null),reasonField=useRef<HTMLTextAreaElement>(null),firstCheckbox=useRef<HTMLInputElement>(null)
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]),[confirming,setConfirming]=useState(false),[reason,setReason]=useState(''),[working,setWorking]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 useEffect(()=>{active.current=true;return()=>{active.current=false;onBusyChange(field,false);onSelectionChange(false)}},[field,onBusyChange,onSelectionChange])
 useEffect(()=>{onSelectionChange(authorized&&selecting)},[authorized,selecting,onSelectionChange])
 useEffect(()=>{if(confirming)reasonField.current?.focus();else if(selecting)firstCheckbox.current?.focus()},[confirming,selecting])
 const permitted=!!user&&authorized,choosing=permitted&&selecting
 const cancel=()=>{setSelecting(false);setSelected([]);setConfirming(false);setReason('');setError('');onSelectionChange(false);requestAnimationFrame(()=>trigger.current?.focus())}
 return <>
 {comments.length?comments.map((item,index)=><div key={item.id} className={styles.comment}>{choosing?<label className={styles.selection}><input ref={index===0?firstCheckbox:undefined} type="checkbox" checked={selected.includes(item.id)} disabled={working||disabled||confirming} onChange={event=>setSelected(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/><CommentContent content={item.content} number={item.number} /></label>:<CommentContent content={item.content} number={item.number} />}</div>):<p>Nenhum comentário publicado.</p>}
 {permitted&&comments.length>0&&<section aria-label="Moderação dos comentários">
 <div className="actions"><button ref={trigger} type="button" disabled={working||disabled||(choosing&&selected.length===0)||confirming} onClick={()=>{setError('');setMessage('');if(!selecting){setSelecting(true);onSelectionChange(true)}else setConfirming(true)}}>{choosing?'Excluir '+selected.length+' comentários':'Excluir comentários'}</button>{choosing&&<button type="button" disabled={working} onClick={cancel}>Cancelar</button>}</div>
 {choosing&&!confirming&&<p>Selecione os comentários desta página. Cada exclusão será registrada e poderá ser restaurada.</p>}
 {confirming&&<form className="form" aria-label="Confirmar exclusão de comentários" onSubmit={event=>{event.preventDefault();if(lock.current||disabled||!user||!authorized||reason.trim().length<5)return;lock.current=true;setWorking(true);setError('');onBusyChange(field,true);void (async()=>{
 try{
  const result=await removeSelectedComments(comments.filter(item=>selected.includes(item.id)),async id=>{const detail=await fetchCommentDetail(user,id);if(detail.comment.status!=='approved'||detail.comment.shortId!==shortId)throw Error('O comentário mudou. Atualize a lista.');return detail.comment},item=>sendCommentReview(user,item,'remove',reason.trim()),()=>active.current)
  if(!active.current)return
  onRemoved(result.removed);setSelected(current=>current.filter(id=>!result.removed.includes(id)));setConfirming(false);setMessage(result.removed.length+' comentário(s) excluído(s).')
  if(result.error){if(result.error instanceof AdminRequestError&&result.error.unauthorized)invalidate('O acesso administrativo expirou ou foi revogado.');setError((result.error instanceof Error?result.error.message:'Não foi possível concluir.')+' Os demais comentários não foram excluídos. Revise a seleção antes de tentar novamente.')}
  else{setSelecting(false);setReason('');onSelectionChange(false);trigger.current?.focus()}
 }catch(failure){if(active.current)setError(failure instanceof Error?failure.message:'Não foi possível concluir a exclusão.')}finally{lock.current=false;if(active.current){setWorking(false);onBusyChange(field,false)}}
 })()}}>
 <p><strong>Confirma a exclusão de {selected.length} comentários selecionados?</strong></p><p>As exclusões são individuais. Se ocorrer uma falha, as concluídas serão mantidas e os restantes continuarão selecionados.</p>
 <label htmlFor={field}>Motivo da decisão (5 a 500 caracteres)</label><textarea ref={reasonField} id={field} required minLength={5} maxLength={500} value={reason} disabled={working} onChange={event=>setReason(event.target.value)}/>
 <div className="actions"><button type="button" disabled={working} onClick={cancel}>Cancelar</button><button className="primary" disabled={working||disabled||reason.trim().length<5}>Excluir {selected.length} comentários</button></div>
 </form>}
 </section>}
 {working&&<p role="status">Excluindo comentários selecionados…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </>
}
