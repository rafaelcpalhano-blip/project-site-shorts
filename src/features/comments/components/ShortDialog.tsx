import { CommentContent } from './CommentContent'
import { VideoSourceLink, PlayerInformation } from '../../players/components/PlayerInformation'
import { OfficialPlayer } from '../../players/components/OfficialPlayer'
import { validateCommentInput } from '../../../lib/validation/public-input'
import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { useDemo } from '../../../app/providers/demo-context'
import type { Short } from '../../shorts/types/models'
export function ShortDialog({ short, onClose }: { short: Short; onClose: () => void }) {
  const { state, comment } = useDemo()
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const comments = state.comments.filter(item => item.shortId === short.id && item.status === 'approved')
  return <Modal title={short.title} onClose={onClose}>
    <OfficialPlayer key={short.id} short={short} />
    <p><VideoSourceLink short={short} /></p>
    <h3>Comentários ({comments.length})</h3>
    {comments.length ? comments.map((item,index) => <CommentContent key={item.id} content={item.content} number={index+1} />) : <p className="muted">Nenhum comentário publicado. Compartilhe sua opinião sobre a jogada.</p>}
    <form className="form" onSubmit={event => {
      event.preventDefault()
      let validated
      try { validated = validateCommentInput({ shortId: short.id, content }) }
      catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Comentário inválido.'); return }
      comment(validated.shortId, validated.content); setContent('')
      setMessage('Comentário enviado para análise nesta sessão. Ele permanece oculto; a moderação ainda não está conectada.')
    }}>
      <div className="form-field">
        <label htmlFor="comment-content">Seu comentário</label>
        <textarea id="comment-content" rows={4} maxLength={500} required value={content} onChange={event => setContent(event.target.value)} />
        <span className="muted">{content.length}/500 caracteres · sem nome ou cadastro</span>
      </div>
      <button className="primary" type="submit">Enviar comentário</button>
      <p role="status">{message}</p>
    </form>
    <PlayerInformation short={short} />
  </Modal>
}

