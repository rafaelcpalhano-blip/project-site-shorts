import {getGameCatalogVersion,subscribeGameCatalog,invalidateGameCatalog} from '../../games/services/catalog-cache'
import { readFailureMessage } from '../../../lib/http/read-failure'
import { ClipperFailure } from '../../../components/clipper/ClipperFailure'
import {updateItemLikeCount,updatePageLikeCount} from '../services/feed-like-count'
import {createOrderedFeedClient,feedOrderLabels} from '../services/ordered-feed-api'
import type {FeedOrder} from '../services/ordered-feed-api'
import { TITLE_SEARCH_ENABLED } from '../../../lib/features/title-search'
import { createTitleSearchClient } from '../services/title-search-api'
import type { TitleSearchCursor } from '../../../lib/validation/title-search'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Cursor, PublicCursor } from '../../../lib/firebase/public-repository'
import type { Game, Short } from '../types/models'
import { ShortCard } from './ShortCard'
import { ShortSequenceDialog } from './ShortSequenceDialog'
import styles from './ShortFeed.module.css'
type FeedCursor=PublicCursor|TitleSearchCursor|string
interface FeedPage {items:Short[];next:FeedCursor|null;limited?:boolean;orderingAt?:string}
const orderedFeed=createOrderedFeedClient()
const searchTitles=createTitleSearchClient()
const repository = createPublicRepository(database)
export function FirestoreFeed({ gameId }: { gameId?: string }) {
  const [order,setOrder]=useState<FeedOrder>('latest')
  const [draft,setDraft]=useState('')
  const [query,setQuery]=useState('')
  const [filter, setFilter] = useState('')
  const [games, setGames] = useState<Game[]>([])
  const [gameCursor, setGameCursor] = useState<Cursor | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [catalogBusy, setCatalogLoading] = useState(false)
  const [page, setPage] = useState<FeedPage>({ items: [], next: null })
  const [cursors, setCursors] = useState<Array<FeedCursor | undefined>>([undefined])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const catalogVersion=useSyncExternalStore(subscribeGameCatalog,getGameCatalogVersion,getGameCatalogVersion)
  const [loadedCatalogVersion,setLoadedCatalogVersion]=useState(-1)
  const catalogLoading=catalogBusy||loadedCatalogVersion!==catalogVersion
  const [selected, setSelected] = useState<Short | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const updateLikeCount=useCallback((id:string,count:number)=>{
    setPage(current=>updatePageLikeCount(current,id,count))
    setSelected(current=>current?updateItemLikeCount(current,id,count):current)
  },[])
  const updateCommentCount=useCallback((id:string,count:number)=>{
    setPage(current=>current.items.some(item=>item.id===id&&item.commentCount!==count)?{...current,items:current.items.map(item=>item.id===id?{...item,commentCount:count}:item)}:current)
    setSelected(current=>current?.id===id&&current.commentCount!==count?{...current,commentCount:count}:current)
  },[])
  const selectedGame = gameId || filter
  const cursor = cursors[index]
  useEffect(() => {
    if(gameId)return
    let active = true
    repository.listGames().then(result => {
      if (active) { setGames(result.items); setGameCursor(result.next); setCatalogError('');setLoadedCatalogVersion(catalogVersion) }
    }).catch(() => { if (active){setGames([]);setGameCursor(null);setCatalogError('Não foi possível carregar o catálogo.');setLoadedCatalogVersion(catalogVersion)} }).finally(()=>{if(active)setCatalogLoading(false)})
    return () => { active = false }
  }, [catalogVersion,gameId])
  useEffect(() => {
    let active = true
    const controller=new AbortController()
    const request=TITLE_SEARCH_ENABLED && query ? searchTitles({query,...(selectedGame?{gameId:selectedGame}:{}),...(cursor?{cursor:cursor as TitleSearchCursor}:{})},controller.signal) : orderedFeed(order,selectedGame||undefined,typeof cursor==='string'?cursor:undefined,controller.signal)
    request.then(async result => {
      const ids = [...new Set(result.items.map(short => short.gameId))]
      const resolved = await Promise.all(ids.map(async id => {
        const name = result.items.find(short => short.gameId === id)?.gameName
        if (name) return [id, name]
        try { return [id, (await repository.getGame(id))?.name || 'Jogo indisponível'] }
        catch { return [id, 'Jogo indisponível'] }
      }))
      if (!active) return
      setNames(Object.fromEntries(resolved)); setPage(result); setLoading(false)
    }).catch(failure => {
      if (active) { setError(readFailureMessage(failure,TITLE_SEARCH_ENABLED && query?'Não foi possível concluir a pesquisa. Limpe a busca para voltar ao feed.':'Não foi possível carregar o feed. Tente novamente.')); setLoading(false) }
    })
    return () => { active = false; controller.abort() }
  }, [selectedGame, cursor, attempt, query, order])
  const refresh = () => {
    setLoading(true); setError(''); setIndex(0); setCursors([undefined]); setAttempt(value => value + 1); if(!gameId)invalidateGameCatalog()
  }
  return <div className={styles.feed}>
    {gameId && <Link to="/">← Voltar ao início</Link>}
    <div className={styles.filters}>
      {TITLE_SEARCH_ENABLED && <form className="form-field" onSubmit={event=>{event.preventDefault();setQuery(draft.trim());setIndex(0);setCursors([undefined]);setLoading(true);setError('');setAttempt(value=>value+1)}}>
        <label htmlFor="persistent-search">Buscar por título</label>
        <input id="persistent-search" type="search" maxLength={500} placeholder="Encontre um trecho do título…" value={draft} onChange={event=>setDraft(event.target.value)} />
        <div className={styles.searchActions}><button type="submit">Pesquisar</button>{(draft||query)&&<button type="button" onClick={()=>{setDraft('');setQuery('');refresh()}}>Limpar busca</button>}</div>
        <small className="muted">Mais recentes primeiro. Pesquise por botão ou Enter.</small>
      </form>}
      {!gameId && <div className="form-field"><label htmlFor="persistent-game">Filtrar por jogo</label>
        <select id="persistent-game" disabled={catalogLoading} value={filter} onChange={event => {
          setFilter(event.target.value); setIndex(0); setCursors([undefined]); setLoading(true); setError('')
        }}><option value="">Todos os jogos</option>{(loadedCatalogVersion===catalogVersion?games:[]).map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select>
        {filter && <Link to={'/jogos/' + encodeURIComponent(filter)}>Ver ficha do jogo</Link>}
        {gameCursor && loadedCatalogVersion===catalogVersion && <button disabled={catalogLoading} onClick={async () => {
          setCatalogLoading(true)
          try { const result = await repository.listGames(gameCursor); if(catalogVersion!==getGameCatalogVersion())return; setGames(current => [...current, ...result.items]); setGameCursor(result.next); setCatalogError('') }
          catch { if(catalogVersion===getGameCatalogVersion())setCatalogError('Não foi possível carregar mais jogos. Tente novamente.') }
          finally { if(catalogVersion===getGameCatalogVersion())setCatalogLoading(false) }
        }}>{catalogLoading ? 'Carregando...' : 'Carregar mais jogos'}</button>}
        {loadedCatalogVersion===catalogVersion && catalogError && <p role="alert">{catalogError}</p>}
      </div>}
      <div className="form-field"><label htmlFor="persistent-order">Filtrar por relevância</label>
        <select id="persistent-order" value={order} onChange={event=>{setOrder(event.target.value as FeedOrder);setIndex(0);setCursors([undefined]);setError('');setLoading(true)}}>{(Object.keys(feedOrderLabels) as FeedOrder[]).map(value=><option key={value} value={value}>{feedOrderLabels[value]}</option>)}</select>
      </div>
    </div>
    <div className={styles.heading}><h2>{TITLE_SEARCH_ENABLED && query?'Resultados para “'+query+'”':feedOrderLabels[order]}</h2><button onClick={refresh}>Atualizar feed</button></div>
    <div className={styles.results}>
    {loading ? <p role="status">Carregando shorts...</p> : error ? <ClipperFailure message={error}><button onClick={()=>{refresh();document.getElementById('main-content')?.focus()}}>Tentar novamente</button></ClipperFailure>
      : page.items.length ? <div className={styles.grid}>{page.items.map(short =>
        <ShortCard key={short.id} short={short} gameName={names[short.gameId]} onOpen={() => setSelected(short)} />)}</div>
      : <p role="status">{!TITLE_SEARCH_ENABLED&&page.next?'Nenhum short visível neste lote. Continue para consultar os próximos.':TITLE_SEARCH_ENABLED&&query&&page.next?'Nenhuma correspondência neste lote. Continue para consultar os próximos candidatos.':TITLE_SEARCH_ENABLED&&query?'Nenhuma correspondência nesta página. A consulta não tem mais candidatos.':'Nenhuma jogada publicada para este filtro.'}</p>}
    </div>
    {TITLE_SEARCH_ENABLED&&query&&!loading&&!error&&page.next&&<p role="status">{page.limited?'Limite de 30 candidatos atingido. ':''}Pode haver mais resultados; use Continuar busca.</p>}
    {!TITLE_SEARCH_ENABLED&&!loading&&!error&&page.next&&page.limited&&<p role="status">Consulta limitada a 30 candidatos. Continue para consultar os próximos shorts.</p>}
    {order==='relevant'&&page.orderingAt&&!loading&&!error&&<p className="muted">Ranking atualizado em {new Date(page.orderingAt).toLocaleString('pt-BR')}. Novas interações entram na próxima geração horária.</p>}
    <nav className={styles.pagination} aria-label="Paginação de shorts">
      <button disabled={loading || index === 0} onClick={() => { setLoading(true); setError(''); setIndex(index - 1) }}>← Anterior</button>
      {cursors.map((_, position) => <button key={position} disabled={loading || position === index} aria-label={'Página ' + (position + 1)}
        aria-current={position === index ? 'page' : undefined}
        onClick={() => { setLoading(true); setError(''); setIndex(position) }}>{position + 1}</button>)}
      <button disabled={loading || !!error || !page.next} onClick={() => {
        setCursors(current => [...current.slice(0, index + 1), page.next!])
        setLoading(true); setError(''); setIndex(index + 1)
      }}>{TITLE_SEARCH_ENABLED&&query?'Continuar busca →':'Próxima →'}</button>
    </nav>
    {selected && <ShortSequenceDialog short={selected} items={page.items} onNavigate={setSelected} onLikeCount={updateLikeCount} onCommentCount={updateCommentCount} onModerated={()=>{setSelected(null);refresh();requestAnimationFrame(()=>document.getElementById('main-content')?.focus())}} onClose={() => setSelected(null)} />}
  </div>
}

