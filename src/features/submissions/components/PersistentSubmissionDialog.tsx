import { createVideoPreviewClient } from '../services/video-preview-api'
import { parseVideoUrl } from '../../../lib/validation/video-url'
import { OfficialGamePicker } from '../../games/components/OfficialGamePicker'
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
const preview = createVideoPreviewClient()
export function PersistentSubmissionDialog({ onClose, onSubmitted }: {
  onClose: () => void; onSubmitted: (result: SubmissionResult) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [titleNotice, setTitleNotice] = useState('')
  const titleEdited = useRef(false)
  const [gameId, setGameId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [games, setGames] = useState<Game[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  useEffect(() => {
    let active = true
    repository.listGames().then(page => {
      if (active) { setGames(page.items); setCursor(page.next); setLoading(false) }
    }).catch(() => { if (active) { setCatalogError('Não foi possível carregar os jogos.'); setLoading(false) } })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    try { parseVideoUrl(url) } catch { return }
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(() => {
      setTitleNotice('Buscando título original...')
      preview(url, controller.signal).then(original => {
        if (!active) return
        if (!titleEdited.current) setTitle(original)
        setTitleNotice('Título original carregado. Você pode editar o título.')
      }).catch(() => {
        if (active) setTitleNotice('Título original indisponível. Você pode informar um título; o vídeo será validado no envio.')
      })
    }, 600)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [url])
  return <Modal title="Compartilhar short" closeDisabled={sending || choosing} onClose={() => { if (!busy.current && !choosing) onClose() }}>
    <p className="muted">O envio depende da disponibilidade do servidor. Conteúdo que precisar de revisão ficará fora do feed.</p>
    <form className="form" aria-busy={sending} onSubmit={async event => {
      event.preventDefault()
      if (busy.current || choosing) return
      busy.current = true; setSending(true); setError('')
      try { onSubmitted(await submit({ url, gameId, channelName, title })) }
      catch (reason) {
        setError(reason instanceof Error && !['AbortError', 'TimeoutError', 'TypeError'].includes(reason.name)
          ? reason.message : 'Não foi possível confirmar o envio. Seus campos foram preservados; confira o feed antes de tentar novamente.')
      } finally { busy.current = false; setSending(false) }
    }}>
      <div className="form-field"><label htmlFor="persistent-url">Link do short *</label>
        <input id="persistent-url" type="url" required maxLength={2048} value={url} disabled={sending} onChange={event => { setUrl(event.target.value); setTitle(''); setTitleNotice(''); titleEdited.current = false }} /></div>
      <div className="form-field"><label htmlFor="persistent-title">Título</label>
        <input id="persistent-title" maxLength={500} value={title} disabled={sending} aria-describedby="title-notice"
          onChange={event => { titleEdited.current = true; setTitle(event.target.value) }} />
        <p id="title-notice" className="muted" role="status">{titleNotice || 'Preenchido pela fonte quando disponível. A edição é opcional.'}</p>
      </div>
      <div className="form-field"><label htmlFor="submission-game">Jogo *</label>
        <select id="submission-game" required value={gameId} disabled={sending || choosing || loading} onChange={event => setGameId(event.target.value)}>
          <option value="">{loading ? 'Carregando jogos...' : 'Selecione um jogo'}</option>
          {games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
        </select>
        {cursor && <button type="button" disabled={loading || sending || choosing} onClick={async () => {
          setLoading(true); setCatalogError('')
          try { const page = await repository.listGames(cursor); setGames(current => [...current, ...page.items]); setCursor(page.next) }
          catch { setCatalogError('Não foi possível carregar mais jogos.') }
          finally { setLoading(false) }
        }}>Carregar mais jogos</button>}
        {catalogError && <p role="alert">{catalogError} <button type="button" disabled={sending || choosing || loading} onClick={() => {
          setLoading(true); setCatalogError(''); setAttempt(value => value + 1)
        }}>Recarregar catálogo</button></p>}
        {!loading && !catalogError && !games.length && <p role="status">Nenhum jogo disponível para publicação.</p>}
      </div>
      <OfficialGamePicker disabled={sending || loading} onBusyChange={setChoosing} onSelected={game => {
        setGames(current => [...current.filter(item => item.id !== game.id), game]); setGameId(game.id); setError('')
      }} />
      <div className="form-field"><label htmlFor="persistent-channel">Nome do canal</label>
        <input id="persistent-channel" maxLength={80} value={channelName} disabled={sending} onChange={event => setChannelName(event.target.value)} /></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button type="button" disabled={sending || choosing} onClick={onClose}>Cancelar</button>
        <button className="primary" type="submit" disabled={sending || choosing || loading || !gameId}>{sending ? 'Enviando...' : 'Compartilhar'}</button></div>
    </form>
  </Modal>
}

