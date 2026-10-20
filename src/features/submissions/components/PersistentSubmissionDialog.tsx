import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Cursor } from '../../../lib/firebase/public-repository'
import type { Game } from '../../shorts/types/models'
import { createSubmissionClient } from '../services/submission-api'
import type { SubmissionResult } from '../services/submission-api'
const repository = createPublicRepository(database)
const submit = createSubmissionClient()
export function PersistentSubmissionDialog({ onClose, onSubmitted }: {
  onClose: () => void; onSubmitted: (result: SubmissionResult) => void
}) {
  const [url, setUrl] = useState('')
  const [gameId, setGameId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [games, setGames] = useState<Game[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  useEffect(() => {
    let active = true
    repository.listGames().then(page => {
      if (active) { setGames(page.items); setCursor(page.next); setLoading(false) }
    }).catch(() => { if (active) { setCatalogError('Não foi possível carregar os jogos.'); setLoading(false) } })
    return () => { active = false }
  }, [attempt])
  return <Modal title="Compartilhar short" closeDisabled={sending} onClose={() => { if (!busy.current) onClose() }}>
    <p className="muted">O envio depende da disponibilidade do servidor. Conteúdo que precisar de revisão ficará fora do feed.</p>
    <form className="form" aria-busy={sending} onSubmit={async event => {
      event.preventDefault()
      if (busy.current) return
      busy.current = true; setSending(true); setError('')
      try { onSubmitted(await submit({ url, gameId, channelName })) }
      catch (reason) {
        setError(reason instanceof Error && !['AbortError', 'TimeoutError', 'TypeError'].includes(reason.name)
          ? reason.message : 'Não foi possível confirmar o envio. Seus campos foram preservados; confira o feed antes de tentar novamente.')
      } finally { busy.current = false; setSending(false) }
    }}>
      <div className="form-field"><label htmlFor="persistent-url">Link do short *</label>
        <input id="persistent-url" type="url" required maxLength={2048} value={url} disabled={sending} onChange={event => setUrl(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="submission-game">Jogo *</label>
        <select id="submission-game" required value={gameId} disabled={sending || loading} onChange={event => setGameId(event.target.value)}>
          <option value="">{loading ? 'Carregando jogos...' : 'Selecione um jogo'}</option>
          {games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
        </select>
        {cursor && <button type="button" disabled={loading || sending} onClick={async () => {
          setLoading(true); setCatalogError('')
          try { const page = await repository.listGames(cursor); setGames(current => [...current, ...page.items]); setCursor(page.next) }
          catch { setCatalogError('Não foi possível carregar mais jogos.') }
          finally { setLoading(false) }
        }}>Carregar mais jogos</button>}
        {catalogError && <p role="alert">{catalogError} <button type="button" disabled={sending || loading} onClick={() => {
          setLoading(true); setCatalogError(''); setAttempt(value => value + 1)
        }}>Recarregar catálogo</button></p>}
        {!loading && !catalogError && !games.length && <p role="status">Nenhum jogo disponível para publicação.</p>}
      </div>
      <div className="form-field"><label htmlFor="persistent-channel">Nome do canal</label>
        <input id="persistent-channel" maxLength={80} value={channelName} disabled={sending} onChange={event => setChannelName(event.target.value)} /></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button type="button" disabled={sending} onClick={onClose}>Cancelar</button>
        <button className="primary" type="submit" disabled={sending || loading || !gameId}>{sending ? 'Enviando...' : 'Compartilhar'}</button></div>
    </form>
  </Modal>
}

