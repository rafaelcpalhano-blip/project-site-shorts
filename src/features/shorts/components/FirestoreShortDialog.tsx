import { PersistentCommentForm } from '../../comments/components/PersistentCommentForm'
import { ReportForm } from '../../reports/ReportForm'
import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Cursor, PublicComment } from '../../../lib/firebase/public-repository'
import type { Short } from '../types/models'
import { OfficialPlayer } from '../../players/components/OfficialPlayer'
const repository = createPublicRepository(database)
export function FirestoreShortDialog({ short, onClose }: { short: Short; onClose: () => void }) {
  const [commenting, setCommenting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [comments, setComments] = useState<PublicComment[]>([])
  const [cursor, setCursor] = useState<Cursor>()
  const [next, setNext] = useState<Cursor | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    repository.listComments(short.id, cursor).then(page => {
      if (!active) return
      setComments(page.items); setNext(page.next); setLoading(false)
    }).catch(() => { if (active) { setError('Não foi possível carregar os comentários. Verifique o emulador.'); setLoading(false) } })
    return () => { active = false }
  }, [short.id, cursor, attempt])
  return <Modal title={short.title} closeDisabled={reporting || commenting} onClose={() => { if (!reporting && !commenting) onClose() }}>
    <OfficialPlayer key={short.id} short={short} />
    <ReportForm key={short.id} shortId={short.id} onBusyChange={setReporting} />
    <h3>Comentários publicados</h3>
    {loading ? <p role="status">Carregando comentários...</p> : error ? <div role="alert"><p>{error}</p>
      <button onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1) }}>Tentar novamente</button></div>
      : comments.length ? comments.map(item => <p key={item.id} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.content}</p>) : <p>Nenhum comentário publicado.</p>}
    {!loading && !error && next && <button onClick={() => { setLoading(true); setCursor(next) }}>Próximos comentários →</button>}
    <button disabled={loading || commenting} onClick={() => { setCursor(undefined); setError(''); setLoading(true); setAttempt(value => value + 1) }}>Atualizar comentários</button>
    <PersistentCommentForm key={short.id} shortId={short.id} disabled={reporting} onBusyChange={setCommenting}
      onPublished={() => { setCursor(undefined); setError(''); setLoading(true); setAttempt(value => value + 1) }} />
  </Modal>
}
