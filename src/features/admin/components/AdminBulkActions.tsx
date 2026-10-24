import {useCallback,useEffect,useId,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import type {User} from 'firebase/auth'
import {AdminBulkContext} from '../context/admin-bulk-context'
import {AdminRequestError} from '../services/moderation-api'
import {bulkLabels,bulkLimit,commonBulkActions,prepareBulkItem,runAdminBatch} from '../services/admin-bulk'
import type {BulkAction,BulkItem,BulkResult,BulkRow} from '../services/admin-bulk'
import styles from './ModerationPanel.module.css'
export function AdminBulkActions({user,onUnauthorized,children}:{user:User;onUnauthorized:()=>void;children:ReactNode}){
 const resultHeading=useRef<HTMLHeadingElement>(null),focusReturn=useRef<()=>void>(()=>{})
 const id=useId(),active=useRef(true),lock=useRef(false),epoch=useRef(0),current=useRef<BulkItem[]>([])
 const [items,setItems]=useState<BulkItem[]>([]),[busy,setBusy]=useState(false),[action,setAction]=useState<BulkAction|''>(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[results,setResults]=useState<BulkResult[]>([]),[completed,setCompleted]=useState(new Set<string>())
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const [revision,setRevision]=useState(0)
 const invalidateLists=useCallback(()=>setRevision(value=>value+1),[])
 const update=(next:BulkItem[])=>{current.current=next;setItems(next);setAction('');setConfirmed(false)}
 const clear=(preserveResults=false)=>{if(lock.current)return;epoch.current++;update([]);if(!preserveResults){setCompleted(new Set());setResults([]);}setReason('');setError('')}
 const toggle=async(row:BulkRow,checked:boolean,returnFocus?:()=>void)=>{
  if(lock.current)return
  const key=row.kind+':'+row.id
  if(!checked){update(current.current.filter(item=>item.key!==key));return}
  if(completed.has(key)||current.current.some(item=>item.key===key))return
  if(current.current.length>=bulkLimit){setError('Selecione até '+bulkLimit+' registros por lote.');return}
  const generation=epoch.current;lock.current=true;setBusy(true);setError('')
  try{const item=await prepareBulkItem(user,row);if(!active.current||generation!==epoch.current)return;if(!item.actions.length){setError('Não há ação em lote disponível para este registro. Confira seus detalhes.');return}if(!current.current.length&&returnFocus)focusReturn.current=returnFocus;update([...current.current,item])}
  catch(failure){if(active.current){if(failure instanceof AdminRequestError&&failure.unauthorized)onUnauthorized();else setError(failure instanceof AdminRequestError?failure.message:'Não foi possível preparar a seleção. Atualize a fila.')}}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 const actions=commonBulkActions(items)
 return <AdminBulkContext.Provider value={{busy,items,completed,toggle,clear,revision,invalidateLists}}>{children}
 {!items.length&&busy&&<p role="status">Processando operação administrativa…</p>}
 {!items.length&&error&&<p role="alert">{error}</p>}
 {!!items.length&&<section className={styles.bulk} aria-label="Ações administrativas em lote"><h2>Ações:</h2>
 <p>Selecione até {bulkLimit} registros da página atual. Ao mudar de fila, filtro, ordem ou página, a seleção será limpa.</p>
 {busy&&<p role="status">Processando operação administrativa…</p>}{error&&<p role="alert">{error}</p>}
 <form className="form" onSubmit={event=>{event.preventDefault();if(lock.current||!confirmed||!action)return;lock.current=true;setBusy(true);setResults([]);setError('');const selected=[...current.current];void runAdminBatch(selected,action,reason,()=>active.current,result=>{if(active.current)setResults(value=>[...value,result])}).then(result=>{if(!active.current)return;const done=result.results.filter(item=>item.status==='done').map(item=>item.key);setCompleted(previous=>new Set([...previous,...done]));update(current.current.filter(item=>!done.includes(item.key)));if(result.unauthorized)onUnauthorized();else requestAnimationFrame(()=>{if(active.current)resultHeading.current?.focus()})}).catch(()=>{if(active.current)setError('O lote não foi iniciado. Confira a seleção e o motivo.')}).finally(()=>{lock.current=false;if(active.current){setBusy(false);invalidateLists()}})}}>
 <p>{items.length} registro(s) selecionado(s).</p><ul>{items.map(item=><li key={item.key}>{item.label}</li>)}</ul>
 <label htmlFor={id+'action'}>Ação para todos os selecionados</label><select id={id+'action'} value={action} disabled={busy} onChange={event=>{setAction(event.target.value as BulkAction|'');setConfirmed(false)}}><option value="">Selecione uma ação</option>{actions.map(value=><option key={value} value={value}>{bulkLabels[value]}</option>)}</select>
 {!actions.length&&<p>Os estados selecionados não têm uma ação comum. Separe a seleção por estado.</p>}
 <p>As decisões são individuais. O lote para na primeira falha; resultados anteriores permanecem. Confira o histórico se uma resposta não for confirmada. Não há repetição automática.</p>
 {action==='request:create'&&<p>Cada solicitação usará seu próprio nome para um cadastro manual. A vinculação a um jogo IGDB exige escolha individual e não será feita em lote.</p>}
 {(action==='video:approve'||action==='video:restore')&&<p>O servidor repetirá as verificações técnicas necessárias. Publicações inéditas respeitam a cota do autor; desbloqueios e restaurações seguem a política já existente.</p>}
 {action==='game:unban'&&<p>Cada jogo volta ao estado registrado antes do banimento; um jogo anteriormente oculto continuará oculto.</p>}
 <label htmlFor={id+'reason'}>Motivo da decisão em lote</label><textarea id={id+'reason'} required minLength={5} maxLength={500} disabled={busy} value={reason} onChange={event=>{setReason(event.target.value);setConfirmed(false)}}/>
 <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> Confirmo a ação e o motivo para cada registro selecionado.</label>
 <div className={styles.actions}><button type="button" disabled={busy} onClick={()=>{update([]);setReason('');setError('');requestAnimationFrame(()=>{if(active.current)focusReturn.current()})}}>Cancelar seleção</button><button className="primary" disabled={busy||!confirmed||!action||!actions.includes(action)||reason.trim().length<5}>Confirmar ação</button></div>
 </form>
 </section>}
 {!!results.length&&<section className={styles.bulk} aria-label="Resultado da operação"><div role="status"><h3 ref={resultHeading} tabIndex={-1}>Resultado por registro</h3><ul>{results.map(result=><li key={result.key}><strong>{result.label}</strong> · {result.status==='done'?'Concluído':result.status==='failed'?'Não confirmado':'Não iniciado'}: {result.message}</li>)}</ul><p>As listas consultadas são atualizadas após o lote. Se a atualização falhar, use o botão Atualizar. Confira o histórico de resultados não confirmados antes de tentar novamente.</p></div></section>}
 </AdminBulkContext.Provider>
}
