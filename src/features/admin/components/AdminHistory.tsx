import {historyAction,historyStatus} from '../services/history-labels'
import {useEffect,useId,useRef,useState} from 'react'
import type {User} from 'firebase/auth'
import {fetchAdminHistory} from '../services/history-api'
import type {HistoryKind,HistoryPage} from '../services/history-api'
import {AdminRequestError} from '../services/moderation-api'
import {useAdminBulk} from '../context/admin-bulk-context'
export function AdminHistory({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}){
 const field=useId(),lock=useRef(false),[kind,setKind]=useState<HistoryKind>('game'),[id,setId]=useState(''),[page,setPage]=useState<HistoryPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const bulk=useAdminBulk()
 const load=async(more=false)=>{if(lock.current||bulk?.busy)return;lock.current=true;setBusy(true);setError('');try{const result=await fetchAdminHistory(user,kind,id.trim(),more?page?.next??undefined:undefined);if(!active.current)return;setPage(current=>more&&current?{items:[...current.items,...result.items],next:result.next}:result)}catch(failure){if(!active.current)return;if(failure instanceof AdminRequestError&&failure.unauthorized)onUnauthorized();else setError(failure instanceof AdminRequestError?failure.message:'Não foi possível consultar o histórico.')}finally{lock.current=false;if(active.current)setBusy(false)}}
 return <details><summary>Consultar histórico administrativo por ID</summary><p>Consulte decisões antigas de um registro, inclusive após sair das filas. Os IDs são exibidos nas listas e detalhes. Somente leitura; até 20 eventos por consulta.</p>
 <form className="form" onSubmit={event=>{event.preventDefault();setPage(null);void load()}}><label htmlFor={field+'kind'}>Tipo de registro</label><select id={field+'kind'} disabled={busy} value={kind} onChange={event=>{setKind(event.target.value as HistoryKind);setPage(null);setError('')}}><option value="game">Jogo</option><option value="game-request">Solicitação antiga</option><option value="comment">Comentário</option><option value="short">Vídeo</option></select><label htmlFor={field}>ID do registro</label><input id={field} required maxLength={128} pattern="[A-Za-z0-9_-]+" value={id} disabled={busy} onChange={event=>{setId(event.target.value);setPage(null);setError('')}}/><button disabled={busy||!!bulk?.busy||!id.trim()}>Consultar histórico</button></form>
 {busy&&<p role="status">Consultando histórico…</p>}{error&&<p role="alert">{error}</p>}{page&&<><p>{page.items.length} evento(s) carregado(s).</p><ul>{page.items.map(event=><li key={event.id}>{new Date(event.createdAt).toLocaleString('pt-BR')} · {historyAction(kind,event.action)} · {event.reason||'Sem motivo registrado'} · Responsável: {event.actor}{event.previousStatus&&<> · {historyStatus(event.previousStatus)} → {event.nextStatus?historyStatus(event.nextStatus):'Não informado'}</>}</li>)}</ul>{page.next&&<button disabled={busy||!!bulk?.busy} onClick={()=>void load(true)}>Mais decisões</button>}</>}
 </details>
}
