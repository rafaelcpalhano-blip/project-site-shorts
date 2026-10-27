import {FeedPagination} from './FeedPagination'
import {useFeedPageScroll} from './use-feed-page-scroll'
import {saveFeedReturn,loadFeedReturn} from '../services/feed-return'
import {loadPublicGames} from '../../games/services/load-public-games'
import {createCursorPages} from '../services/cursor-pages'
import type {Direction} from '../services/sequence-navigation'
import {getGameCatalogVersion,subscribeGameCatalog,invalidateGameCatalog} from '../../games/services/catalog-cache'
import { readFailureMessage } from '../../../lib/http/read-failure'
import { ClipperFailure } from '../../../components/clipper/ClipperFailure'
import {updateItemLikeCount,updatePageLikeCount} from '../services/feed-like-count'
import {createOrderedFeedClient,feedOrderLabels} from '../services/ordered-feed-api'
import type {FeedOrder} from '../services/ordered-feed-api'
import { TITLE_SEARCH_ENABLED } from '../../../lib/features/title-search'
import { createTitleSearchClient } from '../services/title-search-api'
import type { TitleSearchCursor } from '../../../lib/validation/title-search'
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {GamePageNavigation} from '../../games/components/GamePageNavigation'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { PublicCursor } from '../../../lib/firebase/public-repository'
import type { Game, Short } from '../types/models'
import { ShortCard } from './ShortCard'
import { DeferredDialog } from '../../../components/ui/DeferredDialog'
import { createDeferredModule } from '../../../components/ui/deferred-module'
const loadViewer=createDeferredModule(()=>import('./ShortSequenceDialog').then(module=>module.ShortSequenceDialog))
import styles from './ShortFeed.module.css'
type FeedCursor=PublicCursor|TitleSearchCursor|string
interface FeedPage {items:Short[];next:FeedCursor|null;limited?:boolean;orderingAt?:string}
interface FeedReturn {order:FeedOrder;filter:string;index:number;scroll:number;query:string;draft:string;attempt:number;pager:ReturnType<typeof createCursorPages<Short,FeedCursor,FeedPage>>}
const orderedFeed=createOrderedFeedClient()
const searchTitles=createTitleSearchClient()
const repository = createPublicRepository(database)
export function FirestoreFeed({ gameId, reset = false }: { gameId?: string; reset?:boolean }) {
  const location=useLocation()
  const [restored]=useState(()=>!gameId&&!reset?loadFeedReturn<FeedReturn>(location.state?.feedReturn??location.key):undefined)
  const [order,setOrder]=useState<FeedOrder>(restored?.order??'latest')
  const [draft,setDraft]=useState(restored?.draft??'')
  const [query,setQuery]=useState(restored?.query??'')
  const [filter, setFilter] = useState(restored?.filter??'')
  const [games, setGames] = useState<Game[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [catalogBusy, setCatalogLoading] = useState(false)
  const [page, setPage] = useState<FeedPage>({ items: [], next: null })
  const [cursors, setCursors] = useState<Array<FeedCursor | undefined>>([undefined])
  const [index, setIndex] = useState(restored?.index??0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(restored?.attempt??0)
  const catalogVersion=useSyncExternalStore(subscribeGameCatalog,getGameCatalogVersion,getGameCatalogVersion)
  const [loadedCatalogVersion,setLoadedCatalogVersion]=useState(-1)
  const catalogLoading=catalogBusy||loadedCatalogVersion!==catalogVersion
  const [selected, setSelected] = useState<Short | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const pagerCounts=useRef<(patch:(page:FeedPage)=>FeedPage)=>void>(()=>{})
  const updateLikeCount=useCallback((id:string,count:number)=>{
    pagerCounts.current(current=>updatePageLikeCount(current,id,count))
    setPage(current=>updatePageLikeCount(current,id,count))
    setSelected(current=>current?updateItemLikeCount(current,id,count):current)
  },[])
  const updateCommentCount=useCallback((id:string,count:number)=>{
    pagerCounts.current(current=>({...current,items:current.items.map(item=>item.id===id?{...item,commentCount:count}:item)}))
    setPage(current=>current.items.some(item=>item.id===id&&item.commentCount!==count)?{...current,items:current.items.map(item=>item.id===id?{...item,commentCount:count}:item)}:current)
    setSelected(current=>current?.id===id&&current.commentCount!==count?{...current,commentCount:count}:current)
  },[])
  const selectedGame = gameId || filter
  const requestContext=useMemo(()=>({selectedGame,query,order,attempt}),[selectedGame,query,order,attempt])
  const pager=useMemo(()=>{
    if(restored&&requestContext.selectedGame===(gameId||restored.filter)&&requestContext.query===restored.query&&requestContext.order===restored.order&&requestContext.attempt===restored.attempt)return restored.pager
    const {selectedGame,query,order}=requestContext;return createCursorPages<Short,FeedCursor,FeedPage>(async(cursor,signal)=>{
    const result=TITLE_SEARCH_ENABLED&&query?await searchTitles({query,...(selectedGame?{gameId:selectedGame}:{}),...(cursor?{cursor:cursor as TitleSearchCursor}:{})},signal):await orderedFeed(order,selectedGame||undefined,typeof cursor==='string'?cursor:undefined,signal)
    const ids=[...new Set(result.items.filter(short=>!short.gameName).map(short=>short.gameId))]
    const names=Object.fromEntries(await Promise.all(ids.map(async id=>{try{return [id,(await repository.getGame(id))?.name||'Jogo indisponível']}catch{return [id,'Jogo indisponível']}})))
    return {...result,items:result.items.map(short=>({...short,gameName:short.gameName||names[short.gameId]}))}
  })},[requestContext,restored,gameId])
  const {heading,requestScroll}=useFeedPageScroll(loading,index,pager)
  useLayoutEffect(()=>{pagerCounts.current=patch=>pager.update(patch)},[pager])
  const context=useRef(pager),viewerTicket=useRef(0),selectedRef=useRef(selected)
  useLayoutEffect(()=>{context.current=pager;selectedRef.current=selected})
  const snapshot=useRef<FeedReturn|undefined>(undefined)
  const restoreScroll=useRef(restored?.scroll)
  useLayoutEffect(()=>{snapshot.current={order,filter,index,scroll:0,query,draft,attempt,pager}})
  useLayoutEffect(()=>()=>{
    if(!gameId&&snapshot.current)saveFeedReturn(location.key,{...snapshot.current,scroll:window.scrollY})
  },[location.key,gameId])
  useEffect(()=>()=>pager.cancel(),[pager])
  useEffect(()=>{
    if(loading||error||restoreScroll.current===undefined)return
    const position=restoreScroll.current;restoreScroll.current=undefined
    const frame=requestAnimationFrame(()=>window.scrollTo({top:position,behavior:'instant'}))
    return()=>cancelAnimationFrame(frame)
  },[loading,error])
  useEffect(() => {
    if(gameId)return
    let active = true
    loadPublicGames(repository.listGames).then(items => {
      if (active) { setGames(items); setCatalogError('');setLoadedCatalogVersion(catalogVersion) }
    }).catch(() => { if (active){setGames([]);setCatalogError('Não foi possível carregar o catálogo.');setLoadedCatalogVersion(catalogVersion)} }).finally(()=>{if(active)setCatalogLoading(false)})
    return () => { active = false }
  }, [catalogVersion,gameId])
  useEffect(()=>{
    let active=true
    pager.load(index).then(result=>{
      if(!active)return
      setNames(Object.fromEntries(result.items.map(short=>[short.gameId,short.gameName||'Jogo indisponível'])))
      setPage(result);setCursors(pager.knownCursors());setLoading(false)
    }).catch(failure=>{if(active){setError(readFailureMessage(failure,'Não foi possível carregar o feed. Tente novamente.'));setLoading(false)}})
    return()=>{active=false}
  },[pager,index])
  const boundary=async(direction:Direction)=>{
    const ticket=++viewerTicket.current,owner=pager,current=selectedRef.current
    const result=await pager.adjacent(index,direction,page.items.map(short=>short.id))
    if(context.current!==owner||ticket!==viewerTicket.current||selectedRef.current?.id!==current?.id)throw new DOMException('Consulta cancelada','AbortError')
    if(!result)return null
    setPage(result.page);setIndex(result.index);setCursors(pager.knownCursors());setError('');setLoading(false)
    return result.target
  }
  const closeViewer=()=>{
    viewerTicket.current++;const id=selected?.id;setSelected(null)
    requestAnimationFrame(()=>{const node=document.querySelector<HTMLElement>('[data-short-id="'+id+'"] button');node?.scrollIntoView({block:'nearest'});node?.focus({preventScroll:true})})
  }
  const changePage=(position:number)=>{
    if(loading||position===index||position<0||position>=cursors.length)return
    restoreScroll.current=undefined
    requestScroll(position)
    setLoading(true);setError('');setIndex(position)
  }
  const refresh = () => {
    viewerTicket.current++;setSelected(null)
    setLoading(true); setError(''); setIndex(0); setCursors([undefined]); setAttempt(value => value + 1); if(!gameId)invalidateGameCatalog()
  }
  return <div className={styles.feed}>
    {gameId && <GamePageNavigation />}
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
        {filter && <Link to={'/jogos/' + encodeURIComponent(filter)} state={{feedOrigin:location.key}}>Ver ficha do jogo</Link>}
        {catalogLoading&&<p role="status">Carregando jogos…</p>}
        {loadedCatalogVersion===catalogVersion && catalogError && <p role="alert">{catalogError} <button type="button" onClick={()=>invalidateGameCatalog()}>Recarregar catálogo</button></p>}
      </div>}
      <div className="form-field"><label htmlFor="persistent-order">Filtrar por relevância</label>
        <select id="persistent-order" value={order} onChange={event=>{setOrder(event.target.value as FeedOrder);setIndex(0);setCursors([undefined]);setError('');setLoading(true)}}>{(Object.keys(feedOrderLabels) as FeedOrder[]).map(value=><option key={value} value={value}>{feedOrderLabels[value]}</option>)}</select>
      </div>
    </div>
    <div className={styles.heading}><h2 ref={heading} tabIndex={-1}>{TITLE_SEARCH_ENABLED && query?'Resultados para “'+query+'”':feedOrderLabels[order]}</h2><button onClick={refresh}>Atualizar feed</button></div>
    <div className={styles.results}>
    {loading ? <p role="status">Carregando shorts...</p> : error ? <ClipperFailure message={error}><button onClick={()=>{refresh();document.getElementById('main-content')?.focus()}}>Tentar novamente</button></ClipperFailure>
      : page.items.length ? <div className={styles.grid}>{page.items.map(short =>
        <ShortCard key={short.id} gameLinkState={gameId?location.state:{feedOrigin:location.key}} short={short} gameName={names[short.gameId]} onOpen={() => setSelected(short)} />)}</div>
      : <p role="status">{!TITLE_SEARCH_ENABLED&&page.next?'Nenhum short visível neste lote. Continue para consultar os próximos.':TITLE_SEARCH_ENABLED&&query&&page.next?'Nenhuma correspondência neste lote. Continue para consultar os próximos candidatos.':TITLE_SEARCH_ENABLED&&query?'Nenhuma correspondência nesta página. A consulta não tem mais candidatos.':'Nenhuma jogada publicada para este filtro.'}</p>}
    </div>
    {TITLE_SEARCH_ENABLED&&query&&!loading&&!error&&page.next&&<p role="status">{page.limited?'Limite de 30 candidatos atingido. ':''}Pode haver mais resultados; use Continuar busca.</p>}
    {!TITLE_SEARCH_ENABLED&&!loading&&!error&&page.next&&page.limited&&<p role="status">Consulta limitada a 30 candidatos. Continue para consultar os próximos shorts.</p>}
    {order==='relevant'&&page.orderingAt&&!loading&&!error&&<p className="muted">Ranking atualizado em {new Date(page.orderingAt).toLocaleString('pt-BR')}. Novas interações entram na próxima atualização do ranking.</p>}
    <FeedPagination current={index} available={Math.max(index+1,cursors.length)} busy={loading} canNext={!error&&!!page.next} nextLabel={TITLE_SEARCH_ENABLED&&query?'Continuar busca →':'Próxima →'} onChange={changePage}/>
    {selected && <DeferredDialog title="Visualizador de short" load={loadViewer} onClose={closeViewer} dialogProps={{short:selected, items:page.items, hasPreviousPage:index>0, hasNextPage:!!page.next, onBoundary:boundary, onNavigate:setSelected, onLikeCount:updateLikeCount, onCommentCount:updateCommentCount, onModerated:()=>{setSelected(null);refresh();requestAnimationFrame(()=>document.getElementById('main-content')?.focus())}, onClose:closeViewer}} />}
  </div>
}

