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
    <div className="inset">
      <p>Prévia ilustrativa · {short.platform}</p>
      <p>Este protótipo não reproduz vídeos.</p>
      {short.url
        ? <a href={short.url} target="_blank" rel="noopener noreferrer">Assistir na plataforma ↗</a>
        : <p className="muted">Publicação fictícia, sem vídeo de origem.</p>}
    </div>
    <h3>Comentários ({comments.length})</h3>
    {comments.length ? comments.map(item => <p key={item.id}>{item.content}</p>) : <p className="muted">Nenhum comentário publicado. Compartilhe sua opinião sobre a jogada.</p>}
    <form className="form" onSubmit={event => {
      event.preventDefault()
      if (!content.trim()) { setMessage('Escreva um comentário antes de enviar.'); return }
      comment(short.id, content.trim()); setContent('')
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
  </Modal>
}

