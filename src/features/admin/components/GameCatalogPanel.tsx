import {useAdminListRefresh} from './use-admin-list-refresh'
import {CatalogGameRow} from './CatalogGameRow'
import {useAdminBulk} from '../context/admin-bulk-context'
import {ManualGameEditor} from './ManualGameEditor'
import {AdminFilters} from './AdminFilters'
import {catalogDescriptions} from './filter-descriptions'
import {AdminOrder} from './AdminOrder'
import type {AdminSort} from '../types/list-order'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { AdminRequestError } from '../services/moderation-api'
import { fetchCatalog, fetchCatalogGame, moderateGame } from '../services/game-catalog-api'
import type { CatalogAction, CatalogCursor, CatalogDetail, CatalogFilter, CatalogPage, CatalogGame } from '../services/game-catalog-api'
import { ReasonShortcuts } from './ReasonShortcuts'
import { emptyReason, formatReason } from '../services/reason-shortcuts'
import { RefreshButton } from './RefreshButton'
import styles from './ModerationPanel.module.css'
const tabs:Record<CatalogFilter,string>={all:'Todos',active:'Ativos',provisional:'Provisórios',hidden:'Ocultos',banned:'Jogos banidos'}
const actions:Record<CatalogAction,string>={approve:'Aprovar cadastro provisório',hide:'Ocultar/desativar',ban:'Banir jogo',unban:'Desbanir jogo',restore:'Restaurar jogo'}
const date=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR'):'Data não informada'
const state=(game:CatalogGame)=>game.status==='active'?(game.provisional?'Provisório':'Ativo'):game.status==='banned'?'Banido':'Oculto'
export function GameCatalogPanel({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}){
 const bulk=useAdminBulk()
 const [sort,setSort]=useState<AdminSort>('date-desc')
 const [filter,setFilter]=useState<CatalogFilter>('all'),[page,setPage]=useState<CatalogPage|null>(null),[history,setHistory]=useState<Array<CatalogCursor|undefined>>([])
 const [detail,setDetail]=useState<CatalogDetail|null>(null),[action,setAction]=useState<CatalogAction|null>(null),[draft,setDraft]=useState(emptyReason),[confirmed,setConfirmed]=useState(false)
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),lock=useRef(false),active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const reason=formatReason(draft)
 const reset=()=>{setDetail(null);setAction(null);setDraft(emptyReason());setConfirmed(false)}
 const run=async(work:()=>Promise<void>,preserveFeedback=false)=>{
  if(lock.current||bulk?.busy)return
  bulk?.clear(preserveFeedback)
  lock.current=true;setWorking(true);setError('');if(!preserveFeedback)setMessage('')
  try{await work()}catch(failure){if(active.current){if(failure instanceof AdminRequestError&&failure.unauthorized){onUnauthorized();return}setError(failure instanceof Error?failure.message:'Operação indisponível.')}}finally{lock.current=false;if(active.current)setWorking(false)}
 }
 const load=async(selected:CatalogFilter=filter,cursor?:CatalogCursor,selectedSort:AdminSort=sort)=>{bulk?.clear(true);const result=await fetchCatalog(user,selected,cursor,selectedSort);if(active.current){setPage(result);reset()}}
 useAdminListRefresh(bulk?.revision,working||!!bulk?.busy,()=>{if(page)void run(async()=>{await load();setHistory([])},true)})
 return <section className={styles.panel} aria-labelledby="catalog-heading">
  <h2 id="catalog-heading">Catálogo administrativo de jogos</h2>

  <p>Revise novos cadastros em Provisórios. Salvar informações não aprova o cadastro: use Aprovar cadastro provisório após a conferência. Esta aprovação não converte o jogo para IGDB nem altera seu ID.</p>
  <p>Ocultar ou banir retira também os shorts das próximas consultas públicas. Os registros, vínculos e estados de moderação dos vídeos são preservados.</p>
  <p className="muted">Ativos inclui provisórios visíveis. Contagens são consultadas somente ao abrir detalhes e incluem shorts em todos os estados.</p>
  <AdminFilters labels={tabs} descriptions={catalogDescriptions} value={filter} disabled={working||!!bulk?.busy} onChange={value=>void run(async()=>{setFilter(value);setPage(null);setHistory([]);reset();await load(value)})} order={<AdminOrder value={sort} disabled={working||!!bulk?.busy} textLabel="Nome" dateLabel="Data de cadastro" onChange={value=>void run(async()=>{setSort(value);setPage(null);setHistory([]);await load(filter,undefined,value)})} />} refresh={<RefreshButton label="Atualizar catálogo de jogos" disabled={working||!!bulk?.busy} onClick={()=>void run(async()=>{await load();if(active.current)setHistory([])})} />} />
  {working&&<p role="status">Consultando catálogo…</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {page&&<>{!page.items.length&&<p>Nenhum jogo neste filtro.</p>}<ul className={styles.list}>{page.items.map(game=><CatalogGameRow key={game.id} game={game} disabled={working||!!bulk?.busy} onChoose={reset} onInspect={()=>void run(async()=>{const result=await fetchCatalogGame(user,game.id);if(active.current){reset();setDetail(result)}})}/>)}</ul><div className={styles.actions}>
   <button disabled={working||!!bulk?.busy||!history.length} onClick={()=>void run(async()=>{const previous=history.slice(0,-1);await load(filter,previous.at(-1));if(active.current)setHistory(previous)})}>Anteriores</button>
   <span>Página {history.length+1} · até 20 jogos</span>
   <button disabled={working||!!bulk?.busy||!page.next} onClick={()=>void run(async()=>{const next=page.next!;await load(filter,next);if(active.current)setHistory([...history,next])})}>Próximos</button>
  </div></>}
  {detail&&<article className={styles.detail}><h3>{detail.game.name} · {state(detail.game)}</h3>
   <p>Cadastro: {date(detail.game.createdAt)} · Origem: {detail.game.source} · Shorts vinculados: {detail.shortCount===null?'Não calculado':detail.shortCount}</p>
   {detail.game.status==='active'&&<p><Link to={'/jogos/'+detail.game.id}>Abrir ficha pública</Link></p>}
   {detail.game.source==='manual'&&detail.metadata&&<ManualGameEditor key={detail.game.id+':'+detail.game.revision} user={user} detail={detail} onBusyChange={busy=>{lock.current=busy;setWorking(busy)}} onUnauthorized={onUnauthorized} onSaved={async()=>{if(!active.current)return;setDetail(null);setAction(null);setConfirmed(false);setMessage('Informações salvas com histórico administrativo.');bulk?.invalidateLists()}}/>}
   {detail.unbanTarget&&<p>Após desbanir: {detail.unbanTarget==='active'?(detail.game.provisional?'provisório visível':'ativo'):'oculto'}. A revisão individual dos shorts será preservada.</p>}
   {!detail.actions.length&&<p>Nenhuma transição segura disponível. Atualize os detalhes; registros sem histórico de banimento não são restaurados automaticamente.</p>}
   <div className={styles.actions}>{detail.actions.map(value=><button key={value} disabled={working||!!bulk?.busy} aria-pressed={action===value} onClick={()=>{setAction(value);setConfirmed(false)}}>{actions[value]}</button>)}</div>
   {action&&<div className="form"><ReasonShortcuts value={draft} disabled={working||!!bulk?.busy} onChange={value=>{setDraft(value);setConfirmed(false)}} />
    <p>{action==='hide'||action==='ban'?'O jogo e seus shorts ficarão fora das próximas consultas públicas. O nome continuará reservado. Nada será apagado.':action==='approve'?'O jogo já está visível. Esta decisão conclui a revisão administrativa do cadastro provisório, preservando seu ID e seus shorts.':action==='unban'?'O jogo voltará ao estado anterior ao banimento. Se estava oculto, continuará oculto.':'O jogo poderá aparecer novamente conforme seu estado. Vídeos removidos ou pendentes mantêm sua própria moderação.'}</p>
    <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={working||!!bulk?.busy} onChange={event=>setConfirmed(event.target.checked)} /> Confirmo esta decisão sobre {detail.game.name}.</label>
    <button className="primary" disabled={working||!!bulk?.busy||!confirmed||reason.trim().length<5||reason.length>500} onClick={()=>void run(async()=>{await moderateGame(user,detail,action,reason);if(active.current){reset();setHistory([]);setMessage('Decisão registrada com motivo e identidade administrativa.')}bulk?.invalidateLists()})}>Confirmar: {actions[action]}</button>
   </div>}
   <h4>Histórico recente</h4>{!detail.history.length&&<p>Nenhum evento disponível.</p>}
   <ul>{detail.history.map(event=><li key={event.id}>{date(event.createdAt)} · {actions[event.action as CatalogAction]??event.action} · {event.reason??'Sem motivo registrado'} · {event.actorUid?'UID: '+event.actorUid:'Registro automático'}</li>)}</ul>
   {detail.historyLimited&&<p>Exibindo até 20 eventos recentes; o histórico completo permanece preservado.</p>}
  </article>}
 </section>
}
