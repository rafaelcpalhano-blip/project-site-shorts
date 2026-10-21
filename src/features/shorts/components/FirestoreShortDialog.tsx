import { ReportForm } from '../../reports/ReportForm'
import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Cursor, PublicComment } from '../../../lib/firebase/public-repository'
import type { Short } from '../types/models'
import { parseVideoUrl } from '../../submissions/services/video-url'
const repository = createPublicRepository(database)
export function FirestoreShortDialog({ short, onClose }: { short: Short; onClose: () => void }) {
  const [reporting, setReporting] = useState(false)
  const [comments, setComments] = useState<PublicComment[]>([])
  const [cursor, setCursor] = useState<Cursor>()
  const [next, setNext] = useState<Cursor | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  let source: string | undefined
  try { source = parseVideoUrl(short.url || '').url } catch { /* No unsafe origin links. */ }
  useEffect(() => {
    let active = true
    repository.listComments(short.id, cursor).then(page => {
      if (!active) return
      setComments(page.items); setNext(page.next); setLoading(false)
    }).catch(() => { if (active) { setError('Não foi possível carregar os comentários. Verifique o emulador.'); setLoading(false) } })
    return () => { active = false }
  }, [short.id, cursor, attempt])
  return <Modal title={short.title} closeDisabled={reporting} onClose={() => { if (!reporting) onClose() }}>
    <p className="muted">Ambiente local de leitura. A reprodução incorporada não está implementada.</p>
    {source && <a href={source} target="_blank" rel="noopener noreferrer">Assistir na plataforma ↗</a>}
    <ReportForm key={short.id} shortId={short.id} onBusyChange={setReporting} />
    <h3>Comentários publicados</h3>
    {loading ? <p role="status">Carregando comentários...</p> : error ? <div role="alert"><p>{error}</p>
      <button onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1) }}>Tentar novamente</button></div>
      : comments.length ? comments.map(item => <p key={item.id}>{item.content}</p>) : <p>Nenhum comentário publicado.</p>}
    {!loading && !error && next && <button onClick={() => { setLoading(true); setCursor(next) }}>Próximos comentários →</button>}
    <p className="muted">O envio de comentários depende do backend das próximas etapas.</p>
  </Modal>
}
