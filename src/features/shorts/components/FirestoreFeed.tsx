import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Cursor, Page } from '../../../lib/firebase/public-repository'
import type { Game, Short } from '../types/models'
import { ShortCard } from './ShortCard'
import { FirestoreShortDialog } from './FirestoreShortDialog'
import styles from './ShortFeed.module.css'
const repository = createPublicRepository(database)
export function FirestoreFeed({ gameId }: { gameId?: string }) {
  const [filter, setFilter] = useState('')
  const [games, setGames] = useState<Game[]>([])
  const [gameCursor, setGameCursor] = useState<Cursor | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [page, setPage] = useState<Page<Short>>({ items: [], next: null })
  const [cursors, setCursors] = useState<Array<Cursor | undefined>>([undefined])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<Short | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const selectedGame = gameId || filter
  const cursor = cursors[index]
  useEffect(() => {
    let active = true
    repository.listGames().then(result => {
      if (active) { setGames(result.items); setGameCursor(result.next); setCatalogError('') }
    }).catch(() => { if (active) setCatalogError('Não foi possível carregar o catálogo.') })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    let active = true
    repository.listShorts(selectedGame || undefined, cursor).then(async result => {
      const ids = [...new Set(result.items.map(short => short.gameId))]
      const resolved = await Promise.all(ids.map(async id => {
        try { return [id, (await repository.getGame(id))?.name || 'Jogo indisponível'] }
        catch { return [id, 'Jogo indisponível'] }
      }))
      if (!active) return
      setNames(Object.fromEntries(resolved)); setPage(result); setLoading(false)
    }).catch(() => {
      if (active) { setError('Não foi possível carregar o feed. Verifique se o emulador está em execução.'); setLoading(false) }
    })
    return () => { active = false }
  }, [selectedGame, cursor, attempt])
  const refresh = () => {
    setLoading(true); setError(''); setIndex(0); setCursors([undefined]); setAttempt(value => value + 1)
  }
  return <>
    {gameId && <Link to="/">← Voltar ao início</Link>}
    <div className={styles.filters}>
      <div className="form-field"><label htmlFor="persistent-search">Buscar por título</label>
        <input id="persistent-search" type="search" disabled placeholder="Busca persistente pendente de definição" />
        <small className="muted">A busca por trechos continua disponível no modo demonstrativo.</small>
      </div>
      {!gameId && <div className="form-field"><label htmlFor="persistent-game">Filtrar por jogo</label>
        <select id="persistent-game" value={filter} onChange={event => {
          setFilter(event.target.value); setIndex(0); setCursors([undefined]); setLoading(true); setError('')
        }}><option value="">Todos os jogos</option>{games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select>
        {filter && <Link to={'/jogos/' + encodeURIComponent(filter)}>Ver ficha do jogo</Link>}
        {gameCursor && <button disabled={catalogLoading} onClick={async () => {
          setCatalogLoading(true)
          try { const result = await repository.listGames(gameCursor); setGames(current => [...current, ...result.items]); setGameCursor(result.next); setCatalogError('') }
          catch { setCatalogError('Não foi possível carregar mais jogos. Tente novamente.') }
          finally { setCatalogLoading(false) }
        }}>{catalogLoading ? 'Carregando...' : 'Carregar mais jogos'}</button>}
        {catalogError && <p role="alert">{catalogError}</p>}
      </div>}
    </div>
    <div className={styles.heading}><h2>Últimos compartilhados</h2><button onClick={refresh}>Atualizar feed</button></div>
    {loading ? <p role="status">Carregando shorts...</p> : error ? <div role="alert"><p>{error}</p><button onClick={refresh}>Tentar novamente</button></div>
      : page.items.length ? <div className={styles.grid}>{page.items.map(short =>
        <ShortCard key={short.id} short={short} gameName={names[short.gameId]} onOpen={() => setSelected(short)} />)}</div>
      : <p role="status">Nenhuma jogada publicada para este filtro.</p>}
    <nav className={styles.pagination} aria-label="Paginação de shorts">
      <button disabled={loading || index === 0} onClick={() => { setLoading(true); setError(''); setIndex(index - 1) }}>← Anterior</button>
      {cursors.map((_, position) => <button key={position} disabled={loading || position === index} aria-label={'Página ' + (position + 1)}
        aria-current={position === index ? 'page' : undefined}
        onClick={() => { setLoading(true); setError(''); setIndex(position) }}>{position + 1}</button>)}
      <button disabled={loading || !!error || !page.next} onClick={() => {
        setCursors(current => [...current.slice(0, index + 1), page.next!])
        setLoading(true); setError(''); setIndex(index + 1)
      }}>Próxima →</button>
    </nav>
    <p className="muted">Página {index + 1} · até 15 shorts · somente conteúdo publicado no emulador.</p>
    {selected && <FirestoreShortDialog short={selected} onClose={() => setSelected(null)} />}
  </>
}

