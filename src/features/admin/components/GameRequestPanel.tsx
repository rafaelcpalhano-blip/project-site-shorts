import { ReasonShortcuts } from './ReasonShortcuts'
import { emptyReason, formatReason } from '../services/reason-shortcuts'
import { RefreshButton } from './RefreshButton'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { OfficialGamePicker } from '../../games/components/OfficialGamePicker'
import { AdminRequestError } from '../services/moderation-api'
import { fetchGameRequests, reviewGameRequest } from '../services/game-requests-api'
import type { RequestStatus, RequestCursor, GameRequestPage, GameRequestItem } from '../services/game-requests-api'
import styles from './ModerationPanel.module.css'
const labels:Record<RequestStatus,string>={pending:'Pendentes',linked:'Vinculadas',rejected:'Rejeitadas'}
export function GameRequestPanel({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}) {
 const [status,setStatus]=useState<RequestStatus>('pending'),[page,setPage]=useState<GameRequestPage|null>(null)
 const [history,setHistory]=useState<Array<RequestCursor|undefined>>([]),[item,setItem]=useState<GameRequestItem|null>(null)
 const [game,setGame]=useState<{id:string;name:string}|null>(null),[reasonDraft,setReason]=useState(emptyReason)
 const [action,setAction]=useState<'link'|'create'|'reject'|null>(null),[working,setWorking]=useState(false),[picking,setPicking]=useState(false)
 const [manual,setManual]=useState(false),[manualName,setManualName]=useState('')
 const [error,setError]=useState(''),[message,setMessage]=useState('')
 const lock=useRef(false),active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const reason=formatReason(reasonDraft)
 const busy=working||picking
 const run=async(work:()=>Promise<void>)=>{
  if(lock.current||picking)return
  lock.current=true;setWorking(true);setError('');setMessage('')
  try{await work()}catch(failure){if(active.current){
   if(failure instanceof AdminRequestError&&failure.unauthorized){onUnauthorized();return}
   setError(failure instanceof Error?failure.message:'Operação indisponível.')
  }}finally{lock.current=false;if(active.current)setWorking(false)}
 }
 const load=async(cursor?:RequestCursor,selectedStatus:RequestStatus=status)=>{
  const result=await fetchGameRequests(user,selectedStatus,cursor)
  if(active.current){setPage(result);setItem(null);setGame(null);setAction(null);setReason(emptyReason())}
 }
 return <section className={styles.panel} aria-labelledby="game-requests-heading">
  <h2 id="game-requests-heading">Catálogo e solicitações de jogos</h2>
  <p>Vincule ao jogo correto no IGDB ou aceite um cadastro manual sem metadados externos. Esta decisão não publica vídeos pelo visitante.</p>
  <div className={styles.actions}>{(Object.keys(labels) as RequestStatus[]).map(value=><button key={value} disabled={busy} aria-pressed={status===value}
   onClick={()=>void run(async()=>{
    setStatus(value);setPage(null);setItem(null);setGame(null);setReason(emptyReason());setAction(null);setHistory([])
    await load(undefined,value)
   })}>{labels[value]}</button>)}
   <RefreshButton label="Atualizar solicitações de jogos" disabled={busy} onClick={()=>void run(async()=>{await load();if(active.current)setHistory([])})} />
  </div>
  {busy&&<p role="status">Consultando catálogo…</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {page&&<>{!page.items.length&&<p>Nenhuma solicitação nesta fila.</p>}
   <ul className={styles.list}>{page.items.map(value=><li key={value.id}>
    <p>{value.name} · {labels[value.status]} · {new Date(value.createdAt).toLocaleString('pt-BR')}</p>
    {value.reason&&<p>Motivo: {value.reason}</p>}{value.gameId&&<Link to={'/jogos/'+value.gameId}>Abrir ficha do jogo</Link>}
    {value.status==='pending'&&<button disabled={busy} onClick={()=>{setItem(value);setGame(null);setManual(false);setManualName(value.name);setReason(emptyReason());setAction(null);setMessage('')}}>Analisar solicitação</button>}
   </li>)}</ul>
   <div className={styles.actions}><button disabled={busy||!history.length} onClick={()=>void run(async()=>{
    const previous=history.slice(0,-1);await load(previous.at(-1));if(active.current)setHistory(previous)
   })}>Solicitações anteriores</button><span>Página {history.length+1} · até 20 itens</span>
   <button disabled={busy||!page.next} onClick={()=>void run(async()=>{
    const next=page.next!;await load(next);if(active.current)setHistory([...history,next])
   })}>Próximas solicitações</button></div>
  </>}
  {item&&<article className={styles.detail}><h3>Solicitação: {item.name}</h3>
   <fieldset disabled={busy}><legend>Como aceitar este jogo?</legend>
    <label><input type="radio" name="game-request-source" checked={!manual} onChange={()=>{setManual(false);setGame(null);setAction(null)}} /> Vincular ao catálogo IGDB</label>
    <label><input type="radio" name="game-request-source" checked={manual} onChange={()=>{setManual(true);setGame(null);setAction(null)}} /> Cadastro manual — jogo sem registro no IGDB</label>
   </fieldset>
   {manual ? <div className="form-field">
    <label htmlFor="manual-game-name">Nome do jogo a cadastrar</label>
    <input id="manual-game-name" value={manualName} maxLength={100} disabled={busy} onChange={event=>{setManualName(event.target.value);setAction(null)}} />
    <p id="game-request-help">Confira o nome e evite duplicatas. A ficha ficará sem descrição ou imagem, identificada como cadastro manual sem vínculo ao IGDB.</p>
   </div> : <>
    <OfficialGamePicker key={item.id} allowRequest={false} disabled={working} onBusyChange={setPicking} onSelected={value=>{setGame(value);setAction(null)}} />
    {game ? <p>Jogo confirmado: {game.name}</p> : <p id="game-request-help">Pesquise o nome real no IGDB, selecione o resultado e confirme o jogo. Se ele não existir na fonte, escolha Cadastro manual.</p>}
   </>}
   <form className="form" onSubmit={event=>{event.preventDefault();if(!action||(action==='link'&&!game)||(action==='create'&&!manualName.trim()))return;void run(async()=>{
    await reviewGameRequest(user,item,reason,action==='create'?{kind:'manual',name:manualName}:action==='link'&&game?{kind:'igdb',gameId:game.id}:undefined)
    await load();if(active.current){setHistory([]);setMessage('Decisão da solicitação registrada.')}
   })}}>
    <ReasonShortcuts value={reasonDraft} onChange={setReason} disabled={busy} />
    <div className={styles.actions}><button type="button" disabled={busy||(manual?!manualName.trim():!game)} aria-describedby={!game?'game-request-help':undefined} aria-pressed={action==='link'||action==='create'} onClick={()=>setAction(manual?'create':'link')}>Aceitar solicitação</button>
     <button type="button" disabled={busy} aria-pressed={action==='reject'} onClick={()=>setAction('reject')}>Rejeitar solicitação</button></div>
    {action&&<p>Confirmar: {action==='create'?'aceitar o cadastro manual de '+manualName:action==='link'?'aceitar e vincular a '+game?.name:'rejeitar a solicitação'}. A decisão ficará no histórico privado.</p>}
    <button className="primary" disabled={busy||!action||reason.trim().length<5||reason.length>500||(action==='link'&&!game)||(action==='create'&&!manualName.trim())}>Confirmar decisão do jogo</button>
   </form>
  </article>}
 </section>
}
