import {FeedPagination} from './FeedPagination'
import {useFeedPageScroll} from './use-feed-page-scroll'
import { TITLE_SEARCH_ENABLED } from '../../../lib/features/title-search'
import { useState } from 'react'
import { useDemo } from '../../../app/providers/demo-context'
import { games } from '../data/fixtures'
import { ShortCard } from './ShortCard'
import { DeferredDialog } from '../../../components/ui/DeferredDialog'
import { createDeferredModule } from '../../../components/ui/deferred-module'
const loadViewer=createDeferredModule(()=>import('../../comments/components/ShortDialog').then(module=>module.ShortDialog))
import type { Short } from '../types/models'
import styles from './ShortFeed.module.css'
export function ShortFeed({ gameId }: { gameId?: string }) {
  const { state } = useDemo()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Short | null>(null)
  const matching = state.shorts.filter(short =>
    (!(gameId || filter) || short.gameId === (gameId || filter)) &&
    (!TITLE_SEARCH_ENABLED || short.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))),
  ).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
  const pages = Math.max(1, Math.ceil(matching.length / 15))
  const currentPage = Math.min(page, pages)
  const {heading,requestScroll}=useFeedPageScroll(false,currentPage-1,gameId||filter)
  const changePage=(position:number)=>{if(position===currentPage-1)return;requestScroll(position);setPage(position+1)}
  return <>
    <div className={styles.filters}>
      {TITLE_SEARCH_ENABLED && <div className="form-field">
        <label htmlFor="feed-search">Buscar por título</label>
        <input id="feed-search" type="search" placeholder="Encontre uma jogada..." value={query}
          onChange={event => { setQuery(event.target.value); setPage(1) }} />
      </div>}
      {!gameId && <div className="form-field">
        <label htmlFor="feed-game">Filtrar por jogo</label>
        <select id="feed-game" value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}>
          <option value="">Todos os jogos</option>
          {games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
        </select>
      </div>}
    </div>
    <div className={styles.heading}>
      <h2 ref={heading} tabIndex={-1}>Últimos Postados</h2>
    </div>
    {matching.length ? <div className={styles.grid}>
      {matching.slice((currentPage - 1) * 15, currentPage * 15).map(short => <ShortCard key={short.id} short={short} gameName={games.find(game => game.id === short.gameId)?.name}
        count={state.comments.filter(item => item.shortId === short.id && item.status === 'approved').length}
        onOpen={() => setSelected(short)} />)}
    </div> : <div className="inset"><h3>Nenhuma jogada encontrada</h3><p>Selecione outro jogo ou limpe os filtros.</p>
      <button type="button" onClick={() => { setQuery(''); setFilter(''); setPage(1) }}>Limpar filtros</button></div>}
    <FeedPagination current={currentPage-1} available={pages} canNext={currentPage<pages} onChange={changePage}/>
    {selected && <DeferredDialog title="Visualizador de short" load={loadViewer} onClose={()=>setSelected(null)} dialogProps={{short:selected,onClose:()=>setSelected(null)}} />}
  </>
}

