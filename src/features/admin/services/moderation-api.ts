import type { User } from 'firebase/auth'
import type { AdminCursor, QueuePage, ReviewAction, ReviewDetail } from '../types/moderation'
export class AdminRequestError extends Error {
  readonly unauthorized: boolean
  constructor(message: string, unauthorized: boolean) { super(message); this.unauthorized = unauthorized }
}
const messages: Record<string, string> = {
  'restore-unavailable': 'Não há histórico seguro para restaurar este registro. O vídeo permanece removido.',
  'stale-review': 'O vídeo ou as denúncias mudaram. Reabra os detalhes antes de decidir.',
  'daily-limit': 'O autor já atingiu cinco publicações hoje. O estado do vídeo foi preservado.',
  'verification-incomplete': 'A fonte ainda não confirmou existência, formato curto e condições técnicas. O estado do vídeo foi preservado.',
  'invalid-video': 'O vídeo ou o jogo não pode ser publicado com os dados atuais.',
  'short-unavailable': 'Vídeo indisponível. Atualize a fila.',
  'invalid-input': 'Confira o motivo e os dados da revisão.',
  'abuse-limit': 'Muitas operações. Aguarde antes de tentar novamente.',
  'totp-required': 'Entre novamente com Google e TOTP.',
}
async function request<T>(user: User, path: string, body: unknown): Promise<T> {
  const token = await user.getIdToken()
  const response = await fetch('/api/admin/' + path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
  const data = await response.json()
  if (!response.ok) throw new AdminRequestError(messages[data?.error] || 'Não foi possível concluir a operação administrativa.',
    response.status === 401 || response.status === 403)
  return data as T
}
export const fetchQueue = (user: User, queue: 'reports' | 'pending' | 'removed', cursor?: AdminCursor) =>
  request<QueuePage>(user, 'queue', { queue, cursor })
export const fetchDetail = (user: User, shortId: string, cursor?: AdminCursor) =>
  request<ReviewDetail>(user, 'detail', { shortId, cursor })
export const sendReview = (user: User, detail: ReviewDetail, action: ReviewAction, reason: string) =>
  request<{ id: string; status: string }>(user, 'review', {
    shortId: detail.short.id, action, reason, revision: detail.short.revision, reportCount: detail.count,
  })
