import type {AdminSort} from '../types/list-order'
import type { User } from 'firebase/auth'
import type { AdminCursor, QueueCursor, QueuePage, ReviewAction, ReviewDetail } from '../types/moderation'
export class AdminRequestError extends Error {
  readonly unauthorized: boolean
  constructor(message: string, unauthorized: boolean) { super(message); this.unauthorized = unauthorized }
}
const messages: Record<string, string> = {
  'invalid-cover': 'Não foi possível validar a capa. Use um link HTTPS público direto para PNG, JPG ou WebP, até 500 KiB e 2048 pixels por lado. Links de páginas, login ou compartilhamento podem não funcionar.',
  'manual-edit-only': 'Somente jogos manuais podem ser editados aqui.',
  'game-name-conflict': 'Este nome ou uma variante já está reservado para outro jogo.',
  'name-history-limit': 'O limite de alterações de nome foi atingido; os demais dados podem ser editados mantendo o nome atual.',
  'admin-order-preparing': 'A ordenação por título ainda está em preparação. Atualize após o preenchimento dos resumos.',
  'game-unavailable': 'Jogo indisponível. Atualize o catálogo.',
  'game-action-unavailable': 'Esta decisão não é permitida no estado atual. Reabra os detalhes.',
  'game-names-preparing': 'O registro seguro de nomes ainda não está pronto. Tente novamente mais tarde.',
  'restore-unavailable': 'Não há histórico seguro para restaurar este registro. O vídeo permanece removido.',
  'stale-review': 'O conteúdo ou as denúncias mudaram. Reabra os detalhes antes de decidir.',
  'daily-limit': 'O autor já atingiu cinco publicações hoje. O estado do vídeo foi preservado.',
  'verification-incomplete': 'A fonte ainda não confirmou existência, formato curto e condições técnicas. O estado do vídeo foi preservado.',
  'invalid-video': 'O vídeo ou o jogo não pode ser publicado com os dados atuais.',
  'request-unavailable': 'Solicitação indisponível. Atualize a fila.',
  'invalid-game': 'Confirme um jogo IGDB ativo antes de vincular.',
  'comment-unavailable': 'Comentário indisponível. Atualize a fila.',
  'short-unavailable': 'Vídeo indisponível. Atualize a fila.',
  'invalid-input': 'Confira o motivo e os dados da revisão.',
  'abuse-limit': 'Muitas operações. Aguarde antes de tentar novamente.',
  'totp-required': 'Entre novamente com Google e TOTP.',
}
export async function request<T>(user: User, path: string, body: unknown): Promise<T> {
  const token = await user.getIdToken()
  const response = await fetch('/api/admin/' + path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
  const data = await response.json()
  if (!response.ok) throw new AdminRequestError(messages[data?.error] || 'Não foi possível concluir a operação administrativa.',
    response.status === 401 || response.status === 403)
  return data as T
}
export const fetchQueue = (user: User, queue: 'reports' | 'pending' | 'removed', cursor?: QueueCursor, sort?:AdminSort) =>
  request<QueuePage>(user, 'queue', { queue, cursor, sort })
export const fetchDetail = (user: User, shortId: string, cursor?: AdminCursor) =>
  request<ReviewDetail>(user, 'detail', { shortId, cursor })
export const sendReview = (user: User, detail: ReviewDetail, action: ReviewAction, reason: string) =>
  request<{ id: string; status: string }>(user, 'review', {
    shortId: detail.short.id, action, reason, revision: detail.short.revision, reportCount: detail.count,
  })
