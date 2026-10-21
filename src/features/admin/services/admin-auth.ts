import { initializeApp, getApps } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
let pending: Promise<Auth> | undefined
export function loadAdminAuth(): Promise<Auth> {
  if (pending) return pending
  pending = (async () => {
    const response = await fetch('/api/admin/config', { credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Autenticação administrativa ainda não configurada no servidor.')
    const config = await response.json()
    if (config?.projectId !== 'clipzone-db02a' || config.authDomain !== 'clipzone-db02a.firebaseapp.com' ||
        typeof config.apiKey !== 'string' || !config.apiKey || typeof config.appId !== 'string' || !config.appId) throw new Error('Configuração administrativa inválida.')
    const existing = getApps().find(app => app.name === 'clipzone-admin-auth')
    const app = existing ?? initializeApp({ apiKey: config.apiKey, appId: config.appId, projectId: config.projectId, authDomain: config.authDomain }, 'clipzone-admin-auth')
    return initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver })
  })()
  pending.catch(() => { pending = undefined })
  return pending
}
const errors: Record<string, string> = {
  'admin-not-configured': 'O UID administrativo ainda não foi configurado no servidor.',
  'admin-forbidden': 'Esta conta não possui autorização administrativa.',
  'totp-required': 'Entre novamente com Google e confirme o código TOTP para acessar.',
  'invalid-token': 'Sessão inválida ou revogada. Saia e entre novamente.',
  'abuse-limit': 'Muitas tentativas. Aguarde antes de verificar novamente.',
}
export async function checkAdminAccess(token: string): Promise<string> {
  const session = await fetch('/api/session', { method: 'POST', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!session.ok) throw new Error('Não foi possível validar a sessão de acesso.')
  const response = await fetch('/api/admin/session', { method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(errors[data?.error] || 'Verificação administrativa indisponível. Tente mais tarde.')
  if (data?.authenticated !== true || typeof data.uid !== 'string' || !data.uid) throw new Error('Resposta de autenticação inválida.')
  return data.uid
}
