import {UpdateSourceLink} from './UpdateSourceLink'
import {useEffect,useRef,useState} from 'react'
import type {User} from 'firebase/auth'
import {AdminRequestError} from '../services/moderation-api'
import {fetchUpdates,markUpdateRead} from '../services/updates-api'
import type {UpdateCategory,UpdateCursor,UpdatesPage} from '../services/updates-api'
import styles from './ModerationPanel.module.css'
const labels={all:'Todas',published:'Publicações',reports:'Denúncias',playback:'Reprodução'}
export function UpdatesPanel({user,onUnauthorized,onReview}:{user:User;onUnauthorized:()=>void;onReview:(shortId:string)=>void}){
 const [category,setCategory]=useState<UpdateCategory>('all'),[page,setPage]=useState<UpdatesPage|null>(null),[history,setHistory]=useState<Array<UpdateCursor|undefined>>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false),active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const run=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work()}catch(e){if(active.current){if(e instanceof AdminRequestError&&e.unauthorized)onUnauthorized();else setError(e instanceof Error?e.message:'Consulta indisponível.')}}finally{lock.current=false;if(active.current)setBusy(false)}}
 // Explicit initial refresh avoids an invisible mounted tab performing background reads.
 const load=async(value:UpdateCategory,cursors:Array<UpdateCursor|undefined>)=>{const result=await fetchUpdates(user,value,cursors.at(-1));if(active.current){setCategory(value);setHistory(cursors);setPage(result)}}
 return <section className={styles.panel} aria-labelledby="updates-heading">
  <h2 id="updates-heading">Atualizações</h2><p>Eventos recentes, do mais novo para o mais antigo. As marcas de leitura são individuais. Sem atualização automática.</p>
  <label>Categoria <select value={category} disabled={busy} onChange={e=>void run(()=>load(e.target.value as UpdateCategory,[]))}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>{' '}
  <button disabled={busy} onClick={()=>void run(()=>load(category,[]))}>Atualizar atualizações</button>
  {busy&&<p role="status">Consultando…</p>}{error&&<p role="alert">{error}</p>}
  {page&&<><p>{page.items.filter(item=>!item.read).length} nova(s) nesta página.</p><ul className={styles.list}>{page.items.map(item=><li key={item.id} className={styles.updateRow}><article className={styles.rowInfo}>
   <strong>{!item.read&&'Novo · '}{labels[item.category]} · {item.title}</strong><p>{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
   <details><summary>Detalhes</summary><p className={styles.sourceLine}><span>Plataforma: {item.platform}</span>{item.source&&<><span aria-hidden="true"> · </span><UpdateSourceLink source={item.source} platform={item.platform}/></>}</p><p>Estado atual: {item.status}</p>{item.gameName&&<p>Jogo: {item.gameName}</p>}<p>Motivo: {item.reason==='provider-confirmed-unavailable'?'Fonte confirmou indisponibilidade ou bloqueio de incorporação':item.reason==='recurring-playback-failure'?'Falhas recorrentes encaminhadas para revisão':item.reason||'Evento confirmado pelo servidor'}</p>{item.category==='reports'&&<p>Situação das denúncias: {item.reportStatus==='reviewed'?'Analisadas':item.reportStatus==='pending'?'Pendentes':'Indisponível'}.</p>}
    {item.category==='playback'&&<><p>{item.action==='playback-block'?'Ocultado após confirmação da fonte.':'Encaminhado para revisão; o evento sozinho não oculta o vídeo.'}</p><p>{item.count} identidades de navegador elegíveis; {item.contextCount} indicações contextuais. Não representam pessoas verificadas. Última ocorrência: {new Date(item.lastOccurrence).toLocaleString('pt-BR')}.</p><p>{item.strongCount} sinais de indisponibilidade/incorporação. Janela: 30 dias.</p><ul>{Object.entries(item.signals).map(([signal,count])=><li key={signal}>{signal}: {count}</li>)}</ul></>}
    <button disabled={busy} onClick={()=>onReview(item.shortId)}>Abrir moderação deste vídeo</button>
   </details>
  </article><div className={styles.rowActions}>{!item.read&&<button disabled={busy} onClick={()=>void run(async()=>{await markUpdateRead(user,item.id,item.version);if(active.current)setPage(current=>current?{...current,items:current.items.map(row=>row.id===item.id?{...row,read:true}:row)}:current)})}>Marcar como lida</button>}
  </div></li>)}</ul>{!page.items.length&&<p>Nenhuma atualização nesta categoria.</p>}
   <div className={styles.actions}><button disabled={busy||!history.length} onClick={()=>void run(()=>load(category,history.slice(0,-1)))}>Anterior</button><span>Página {history.length+1}</span><button disabled={busy||!page.next} onClick={()=>void run(()=>load(category,[...history,page.next!]))}>Próxima</button></div>
  </>}
 </section>
}
