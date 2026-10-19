import { useState } from 'react'
import { useDemo } from '../../../app/providers/demo-context'
import { games } from '../data/fixtures'
import { ShortCard } from './ShortCard'
import { ShortDialog } from '../../comments/components/ShortDialog'
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
    short.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')),
  ).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
  const pages = Math.max(1, Math.ceil(matching.length / 15))
  const currentPage = Math.min(page, pages)
  return <>
    <div className={styles.filters}>
      <div className="form-field">
        <label htmlFor="feed-search">Buscar por título</label>
        <input id="feed-search" type="search" placeholder="Encontre uma jogada..." value={query}
          onChange={event => { setQuery(event.target.value); setPage(1) }} />
      </div>
      {!gameId && <div className="form-field">
        <label htmlFor="feed-game">Filtrar por jogo</label>
        <select id="feed-game" value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}>
          <option value="">Todos os jogos</option>
          {games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
        </select>
      </div>}
    </div>
    <div className={styles.heading}>
      <h2>Últimos compartilhados</h2>
      <p role="status">{matching.length} shorts · mais recentes primeiro · 15 por página</p>
    </div>
    {matching.length ? <div className={styles.grid}>
      {matching.slice((currentPage - 1) * 15, currentPage * 15).map(short => <ShortCard key={short.id} short={short}
        count={state.comments.filter(item => item.shortId === short.id && item.status === 'approved').length}
        onOpen={() => setSelected(short)} />)}
    </div> : <div className="inset"><h3>Nenhuma jogada encontrada</h3><p>Tente outro título ou jogo.</p>
      <button type="button" onClick={() => { setQuery(''); setFilter(''); setPage(1) }}>Limpar filtros</button></div>}
    <nav className={styles.pagination} aria-label="Paginação de shorts">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Anterior</button>
      {pages > 1 ? Array.from({ length: pages }, (_, index) => <button key={index}
        type="button" aria-label={'Página ' + (index + 1)} aria-current={currentPage === index + 1 ? 'page' : undefined}
        onClick={() => setPage(index + 1)}>{index + 1}</button>) : <span>1 / 1</span>}
      <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima →</button>
    </nav>
    {selected && <ShortDialog short={selected} onClose={() => setSelected(null)} />}
  </>
}

