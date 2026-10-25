import {gameNameScore} from '../services/game-options'
import { scheduleAutoCollapse } from '../services/auto-collapse'
import { supportEmailForDisplay } from '../../../config/support'
import { useEffect, useId, useRef, useState, useLayoutEffect, useMemo } from 'react'
import { createGameCatalogClient } from '../services/catalog-api'
import type { OfficialGame } from '../services/catalog-api'
import styles from './OfficialGamePicker.module.css'
const catalog = createGameCatalogClient()
export function OfficialGamePicker({ disabled, onBusyChange, onSelected, allowRequest = true, collapsible = false, services=catalog }: {
  services?:typeof catalog;
  collapsible?: boolean; allowRequest?: boolean; disabled: boolean; onBusyChange: (busy: boolean) => void; onSelected: (game: { id: string; name: string }) => void
}) {
  const choiceGroup = useId()
  const queryId=choiceGroup+'-query'
  const supportEmail=supportEmailForDisplay(import.meta.env.DEV)
  const disclosure=useRef<HTMLDetailsElement>(null)
  const summary=useRef<HTMLElement>(null)
  const cancelCollapse=useRef<(()=>void)|undefined>(undefined)
  const active=useRef(true)
  useEffect(()=>{active.current=true;return()=>{active.current=false;cancelCollapse.current?.()}},[])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OfficialGame[]>([])
  const [selected, setSelected] = useState('')
  const [next,setNext]=useState<number|null>(null),[manualConfirm,setManualConfirm]=useState(false)
  const manualButton=useRef<HTMLButtonElement>(null),manualCancel=useRef<HTMLButtonElement>(null),manualName=useRef('')
  useLayoutEffect(()=>{if(manualConfirm)manualCancel.current?.focus()},[manualConfirm])
  const orderedResults=useMemo(()=>[...results].sort((a,b)=>(gameNameScore(a.officialName,query)-gameNameScore(b.officialName,query))||a.officialName.localeCompare(b.officialName,'pt-BR')),[results,query])
  const cancelManual=()=>{setManualConfirm(false);onBusyChange(false);requestAnimationFrame(()=>manualButton.current?.focus())}
  const [searched, setSearched] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  useEffect(()=>{
    if(!message||!collapsible)return
    const cancel=scheduleAutoCollapse(()=>{
      const section=disclosure.current
      if(!section?.open)return
      if(section.contains(document.activeElement))summary.current?.focus()
      section.open=false
    })
    cancelCollapse.current=cancel
    return cancel
  },[message,collapsible])
  async function run(action: () => Promise<void>) {
    if (lock.current || disabled || !active.current) return
    cancelCollapse.current?.()
    lock.current = true; setWorking(true); onBusyChange(true); setError(''); setMessage('')
    try { await action() }
    catch (reason) { if(active.current)setError(reason instanceof Error && reason.name === 'Error' ? reason.message : 'Não foi possível concluir a consulta. Tente novamente.') }
    finally { lock.current = false; if(active.current){setWorking(false); onBusyChange(false)} }
  }
  const search = () => query.trim()?run(async () => {
    setResults([]);setNext(null); setSelected(''); setSearched(true)
    const page = await services.searchPage(query)
    if(active.current){setResults(page.games);setNext(page.next); setSearched(true)}
  }):Promise.resolve()
  const content = <fieldset disabled={disabled || working} className="form-field">
    <legend>{collapsible ? 'Pesquisa oficial e inclusão de jogos' : 'Não encontrou seu jogo?'}</legend>
    <label htmlFor={queryId}>Pesquisar nome oficial</label>
    <input id={queryId} value={query} maxLength={100} disabled={manualConfirm} onChange={event => {
      cancelCollapse.current?.();setQuery(event.target.value); setResults([]);setNext(null); setSelected(''); setSearched(false); setError(''); setMessage('')
    }} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void search() } }} />
    <button type="button" disabled={!query.trim()||manualConfirm} onClick={() => void search()}>Pesquisar</button>
    {working && <p role="status">Consultando catálogo...</p>}
    {results.length > 0 && <div className={styles.results} role="radiogroup" aria-label="Jogos encontrados no IGDB">
      {orderedResults.map(game => <label key={game.externalId} className={styles.choice}>
        <input className={styles.radio} type="radio" name={choiceGroup} value={game.externalId} checked={selected === game.externalId} onChange={() => setSelected(game.externalId)} />
        <span className={styles.option}>
          <strong>{game.officialName}{selected===game.externalId&&<span aria-hidden="true"> ✓</span>}</strong>
          {(game.releaseDate || game.platforms.length > 0) && <span className={styles.details}>
            {[game.releaseDate?.slice(0, 4), game.platforms.join(', ')].filter(Boolean).join(' · ')}
          </span>}
        </span>
      </label>)}
    </div>}
    {next!==null&&<button type="button" disabled={manualConfirm} onClick={()=>void run(async()=>{const page=await services.searchPage(query,next);if(active.current){setResults(current=>[...new Map([...current,...page.games].map(game=>[game.externalId,game])).values()]);setNext(page.next)}})}>Carregar mais resultados</button>}
    {results.length > 0 && <button type="button" disabled={!selected||manualConfirm} onClick={() => void run(async () => {
      const game = await services.confirm(selected)
      if(!active.current)return
      onSelected(game);setNext(null); setResults([]); setSelected(''); setSearched(false)
    })}>Confirmar este jogo</button>}
    {searched&&!working&&allowRequest&&<button ref={manualButton} type="button" className={styles.manual} aria-expanded={manualConfirm} disabled={manualConfirm} onClick={()=>{manualName.current=query;setManualConfirm(true);onBusyChange(true)}}>Fazer inclusão manual deste jogo</button>}
    {manualConfirm&&<div role="alertdialog" aria-labelledby={choiceGroup+'-manual-title'} className="inset" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelManual()}}}>
      <p id={choiceGroup+'-manual-title'}>Tem certeza de que não encontrou seu jogo na lista e deseja cadastrá-lo manualmente?</p>
      <div className="actions"><button type="button" onClick={()=>{setManualConfirm(false);void run(async()=>{
        const result=await services.includeManual(manualName.current)
        if(!active.current)return
        onSelected(result.game);setSearched(false);setNext(null);setResults([]);setSelected('')
        setMessage(result.created?'Nome cadastrado com sucesso! Ainda será avaliado pela administração. Pode seguir sua postagem normalmente!':'Jogo existente selecionado. Pode seguir sua postagem normalmente!')
      })}}>Incluir manualmente</button><button ref={manualCancel} type="button" onClick={cancelManual}>Não tenho certeza</button></div>
    </div>}
    {searched && !working && <>
      {!results.length && !error && <p className="error" role="status">Jogo não encontrado</p>}
      {allowRequest && <>
        {!!results.length && <p>Se nenhum resultado corresponde ao seu jogo, confira o nome antes de fazer a inclusão manual.</p>}
        <p>Avaliaremos a legitimidade do jogo, mas o cadastro está previamente liberado. Para adicionar informações como imagens, lançamento, gêneros, modos e plataformas, entre em contato {supportEmail?<>pelo e-mail de suporte: <a href={'mailto:'+supportEmail}>{supportEmail}</a>.</>:<>com o suporte.</>}</p>
      </>}
    </>}
    {error && <p role="alert" className="error">{error}</p>}
    <small>Dados de jogos: <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>. Confira o título antes de confirmar.</small>
  </fieldset>
  const status=<p className={styles.success} role="status">{message}</p>
  return collapsible ? <>
    <details ref={disclosure} className={styles.disclosure} onToggle={event=>{if(!event.currentTarget.open)cancelCollapse.current?.()}}>
      <summary ref={summary} onClick={()=>cancelCollapse.current?.()}>Não encontrou seu jogo?</summary>
      {content}
    </details>
    {status}
  </> : <>{content}{status}</>
}
