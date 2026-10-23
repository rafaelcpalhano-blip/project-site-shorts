import { useId, useRef, useState } from 'react'
import type { CommentResult } from '../services/comment-api'
import { createCommentClient } from '../services/comment-api'
const send=createCommentClient()
export function PersistentCommentForm({shortId,disabled,suspended=false,onBusyChange,onPublished}:{
  shortId:string; disabled:boolean; suspended?:boolean; onBusyChange:(busy:boolean)=>void; onPublished:(result:CommentResult)=>void
}) {
  const field=useId()
  const [content,setContent]=useState('')
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const busy=useRef(false)
  const attempt=useRef<{content:string;requestId:string}|null>(null)
  return <form className="form" aria-label="Comentar vídeo" aria-busy={sending} onSubmit={async event=>{
    event.preventDefault()
    if(busy.current || disabled || suspended)return
    busy.current=true;setSending(true);onBusyChange(true);setError('');setMessage('')
    try{
      if(!attempt.current || attempt.current.content!==content)attempt.current={content,requestId:crypto.randomUUID()}
      const result=await send({shortId,content,requestId:attempt.current.requestId})
      setContent('');attempt.current=null
      setMessage(result.status==='approved'?'Comentário publicado.':result.status==='pending'
        ?'Comentário recebido para revisão. Ele permanece oculto até a análise.'
        :'Essa tentativa já foi recebida. O comentário não está público.')
      if(result.status==='approved')onPublished(result)
    }catch(failure){
      setError(failure instanceof Error && failure.name==='Error'?failure.message:'Não foi possível confirmar o envio. Verifique sua conexão. Seu texto foi preservado; atualize os comentários antes de tentar novamente.')
    }finally{busy.current=false;setSending(false);onBusyChange(false)}
  }}>
    <div className="form-field"><label htmlFor={field}>Seu comentário</label>
      <textarea id={field} rows={4} maxLength={500} required value={content} readOnly={suspended} disabled={sending||disabled}
        onChange={event=>setContent(event.target.value)} />
      <small className="muted">{content.length}/500 caracteres · sem nome ou cadastro</small>
    </div>
    {suspended&&<p role="status">Envio pausado enquanto confirmamos os comentários. Seu texto permanece aqui.</p>}
    <p className="muted">Comentários com sinais de ofensa, ameaça ou spam ficam ocultos para revisão.</p>
    <button className="primary" type="submit" disabled={sending||disabled||suspended||!content.trim()}>{sending?'Enviando comentário…':'Enviar comentário'}</button>
    {error&&<p role="alert">{error}</p>}
    {message&&<p role="status">{message}</p>}
  </form>
}
