import { useEffect, useRef, useState } from 'react'
import { createLikesClient } from '../services/likes-api'
import type { LikeState } from '../services/likes-api'
const client=createLikesClient()
export function LikeButton({shortId,onCountChange,onBusyChange}:{shortId:string;onCountChange:(id:string,count:number)=>void;onBusyChange:(busy:boolean)=>void}){
 const [state,setState]=useState<LikeState|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const active=useRef(false),lock=useRef(false)
 useEffect(()=>{
  let current=true
  active.current=true;lock.current=true;onBusyChange(true)
  const controller=new AbortController()
  client.state(shortId,controller.signal).then(result=>{if(current){setState(result);onCountChange(shortId,result.count)}}).catch(failure=>{if(current)setError(failure instanceof Error?failure.message:'Curtida indisponível.')}).finally(()=>{if(current){lock.current=false;setBusy(false);onBusyChange(false)}})
  return()=>{current=false;active.current=false;controller.abort();onBusyChange(false)}
 },[shortId,attempt,onCountChange,onBusyChange])
 const submit=async()=>{
  if(lock.current||!state)return
  lock.current=true;setBusy(true);onBusyChange(true);setError('')
  try{const result=await client.set(state,!state.liked);if(active.current){setState(result);onCountChange(shortId,result.count)}}
  catch(failure){if(active.current){setState(null);setError(failure instanceof Error?failure.message:'Curtida indisponível.')}}
  finally{lock.current=false;if(active.current){setBusy(false);onBusyChange(false)}}
 }
 return <div className="inset" aria-label="Curtidas do Clipzone">
  {state&&<button type="button" disabled={busy} aria-pressed={state.liked} onClick={()=>void submit()}>{state.liked?'♥ Descurtir':'♡ Curtir'} · {state.count}</button>}
  {busy&&<p role="status">Confirmando curtida…</p>}
  {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>{setError('');setState(null);setBusy(true);setAttempt(value=>value+1)}}>Atualizar curtida</button></div>}
  <p className="muted">Curtidas internas do Clipzone. Sua escolha fica vinculada à sessão deste navegador, sem cadastro obrigatório. Limpar cookies ou expirar a sessão perde esse vínculo.</p>
 </div>
}
