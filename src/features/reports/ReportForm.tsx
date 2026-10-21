import { useRef, useState } from 'react'
import { reportReasons } from '../../lib/validation/report-input'
import { createReportClient } from './report-api'
const send = createReportClient()
export function ReportForm({ shortId, onBusyChange }: { shortId: string; onBusyChange: (busy: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const busy = useRef(false)
  if (message) return <p role="status">{message}</p>
  if (!open) return <button type="button" onClick={() => setOpen(true)}>Denunciar vídeo</button>
  return <form className="form" aria-label="Denunciar vídeo" aria-busy={sending} onSubmit={async event => {
    event.preventDefault()
    if (busy.current) return
    busy.current = true; setSending(true); onBusyChange(true); setError('')
    try {
      const result = await send({ shortId, reason })
      setMessage(result.duplicate ? 'Você já denunciou este vídeo. Sua denúncia está registrada.' : 'Denúncia registrada para análise. O vídeo continua visível.')
    } catch (failure) {
      setError(failure instanceof Error && failure.name === 'Error' ? failure.message : 'Não foi possível confirmar a denúncia. Tente novamente mais tarde.')
    } finally { busy.current = false; setSending(false); onBusyChange(false) }
  }}>
    <div className="form-field"><label htmlFor="report-reason">Motivo da denúncia</label>
      <select id="report-reason" required value={reason} disabled={sending} onChange={event => setReason(event.target.value)}>
        <option value="">Selecione um motivo</option>
        {Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <p className="muted">Combate fictício normal do jogo não é violência real. Denunciar não remove o vídeo automaticamente.</p>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="button" disabled={sending} onClick={() => { setOpen(false); setError('') }}>Cancelar denúncia</button>
      <button type="submit" disabled={sending || !reason}>{sending ? 'Enviando denúncia...' : 'Enviar denúncia'}</button></div>
  </form>
}
