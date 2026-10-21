import { useId, useRef, useState } from 'react'
import { createGameCatalogClient } from '../services/catalog-api'
import type { OfficialGame } from '../services/catalog-api'
import styles from './OfficialGamePicker.module.css'
const catalog = createGameCatalogClient()
export function OfficialGamePicker({ disabled, onBusyChange, onSelected, allowRequest = true, collapsible = false }: {
  collapsible?: boolean; allowRequest?: boolean; disabled: boolean; onBusyChange: (busy: boolean) => void; onSelected: (game: { id: string; name: string }) => void
}) {
  const choiceGroup = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OfficialGame[]>([])
  const [selected, setSelected] = useState('')
  const [searched, setSearched] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  async function run(action: () => Promise<void>) {
    if (lock.current || disabled) return
    lock.current = true; setWorking(true); onBusyChange(true); setError(''); setMessage('')
    try { await action() }
    catch (reason) { setError(reason instanceof Error && reason.name === 'Error' ? reason.message : 'Não foi possível concluir a consulta. Tente novamente.') }
    finally { lock.current = false; setWorking(false); onBusyChange(false) }
  }
  const search = () => run(async () => {
    setResults([]); setSelected(''); setSearched(false)
    const games = await catalog.search(query)
    setResults(games); setSearched(true)
  })
  const content = <fieldset disabled={disabled || working} className="form-field">
    <legend>{collapsible ? 'Pesquisa oficial e inclusão de jogos' : 'Não encontrou seu jogo?'}</legend>
    <label htmlFor="official-game-query">Pesquisar nome oficial</label>
    <input id="official-game-query" value={query} maxLength={100} onChange={event => {
      setQuery(event.target.value); setResults([]); setSelected(''); setSearched(false); setError(''); setMessage('')
    }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search() } }} />
    <button type="button" disabled={!query.trim()} onClick={() => void search()}>Pesquisar no IGDB</button>
    {working && <p role="status">Consultando catálogo...</p>}
    {results.length > 0 && <div className={styles.results} role="radiogroup" aria-label="Jogos encontrados no IGDB">
      {results.map(game => <label key={game.externalId} className={styles.choice}>
        <input className={styles.radio} type="radio" name={choiceGroup} value={game.externalId} checked={selected === game.externalId} onChange={() => setSelected(game.externalId)} />
        <span className={styles.option}>
          <strong>{game.officialName}</strong>
          {(game.releaseDate || game.platforms.length > 0) && <span className={styles.details}>
            {[game.releaseDate?.slice(0, 4), game.platforms.join(', ')].filter(Boolean).join(' · ')}
          </span>}
        </span>
      </label>)}
    </div>}
    {results.length > 0 && <button type="button" disabled={!selected} onClick={() => void run(async () => {
      const game = await catalog.confirm(selected)
      onSelected(game); setResults([]); setSelected(''); setSearched(false)
    })}>Confirmar este jogo</button>}
    {searched && !results.length && <>
      <p>Nenhum jogo encontrado. Tente o nome original ou outro nome conhecido.</p>
      {allowRequest && <button type="button" onClick={()=>void run(async()=>{
        const result=await catalog.request(query)
        if(result.status==='linked' && result.game){onSelected(result.game);setMessage('Solicitação já vinculada. Jogo selecionado.')}
        else setMessage(result.status==='rejected'?'Esta solicitação foi rejeitada. Confira o nome e pesquise novamente.':
          'Solicitação registrada para análise. Seus campos continuam neste formulário enquanto ele permanecer aberto. Depois da análise, pesquise novamente o jogo; o vídeo ainda não foi enviado.')
      })}>Solicitar inclusão deste jogo</button>}
    </>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <small>Dados de jogos: <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>. Confira o título antes de confirmar.</small>
  </fieldset>
  return collapsible ? <details className={styles.disclosure}>
    <summary>Não encontrou seu jogo?</summary>
    {content}
  </details> : content
}
