import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { GamePicker } from '../../games/components/GamePicker'
import { games } from '../../shorts/data/fixtures'
import { parseVideoUrl } from '../services/video-url'
import { useDemo } from '../../../app/providers/demo-context'
export function SubmissionDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const { state, publish } = useDemo()
  const [url, setUrl] = useState('')
  const [gameId, setGameId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [error, setError] = useState('')
  return <Modal title="Compartilhar short" onClose={onClose}>
    <p className="muted">Compartilhamento demonstrativo, válido apenas nesta sessão. Campos com * são obrigatórios.</p>
    <form className="form" onSubmit={event => {
      event.preventDefault()
      try {
        const video = parseVideoUrl(url)
        if (!games.some(game => game.id === gameId)) throw new Error('Selecione exatamente um jogo cadastrado.')
        if (state.shorts.some(short => short.identity === video.identity)) throw new Error('Este short já foi compartilhado nesta sessão.')
        publish({ ...video, id: crypto.randomUUID(), gameId, channelName: channelName.trim(),
          title: 'Short de ' + games.find(game => game.id === gameId)!.name, createdAt: Date.now() })
        onPublished()
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível compartilhar.') }
    }}>
      <div className="form-field">
        <label htmlFor="submission-url">Link do short *</label>
        <input id="submission-url" type="url" required maxLength={2048} placeholder="https://www.youtube.com/shorts/..." value={url}
          aria-describedby="submission-error" onChange={event => { setUrl(event.target.value); setError('') }} />
      </div>
      <GamePicker value={gameId} onChange={setGameId} />
      <div className="form-field">
        <label htmlFor="submission-channel">Nome do canal</label>
        <input id="submission-channel" maxLength={80} value={channelName} onChange={event => setChannelName(event.target.value)} />
      </div>
      <p id="submission-error" className="error" role="alert">{error}</p>
      <p className="muted">Título e reprodução não são verificados. O limite diário e as garantias contra abuso serão implementados no servidor.</p>
      <div className="actions"><button type="button" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Compartilhar</button></div>
    </form>
  </Modal>
}

