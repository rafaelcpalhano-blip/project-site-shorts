import { createPublicKey, verify as verifySignature } from 'node:crypto'
export class AdminAuthError extends Error {
  readonly status: number
  constructor(code: string, status = 401) { super(code); this.status = status }
}
interface Options {
  projectId: string; apiKey: string; allowedUids: string[]
  now?: () => Date; fetcher?: typeof fetch
}
const certUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
function decode(value: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new AdminAuthError('invalid-token')
  const result: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new AdminAuthError('invalid-token')
  return result as Record<string, unknown>
}
// Native Node crypto verifies Firebase's RS256 signature; no unverified claim grants access.
// This adapter must be reviewed for the chosen deployment runtime before public deployment.
export function createAdminAuthorizer(options: Options) {
  if (!/^[a-z][a-z0-9-]{2,99}$/.test(options.projectId) || !options.apiKey ||
      options.allowedUids.some(uid => !uid || uid.length > 128 || /\s/.test(uid))) throw new Error('Invalid admin configuration')
  const allowed = new Set(options.allowedUids)
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? (() => new Date())
  let cached: { values: Record<string, string>; expires: number } | undefined
  let pending: Promise<Record<string, string>> | undefined
  const certificates = async () => {
    if (cached && cached.expires > now().getTime()) return cached.values
    if (pending) return pending
    pending = (async () => {
      const response = await fetcher(certUrl, { redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new AdminAuthError('auth-unavailable', 503)
      const values = await response.json()
      if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length > 32 ||
          Object.values(values).some(value => typeof value !== 'string')) throw new AdminAuthError('auth-unavailable', 503)
      const seconds = Number(/(?:^|[,\s])max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 0)
      cached = { values, expires: now().getTime() + Math.min(seconds, 3600) * 1000 }
      return values as Record<string, string>
    })()
    try { return await pending } finally { pending = undefined }
  }
  return async (request: Request): Promise<{ uid: string; email: string }> => {
    if (!allowed.size) throw new AdminAuthError('admin-not-configured', 503)
    const authorization = request.headers.get('authorization') || ''
    if (authorization.length > 16384 || !authorization.startsWith('Bearer ')) throw new AdminAuthError('invalid-token')
    const token = authorization.slice(7)
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new AdminAuthError('invalid-token')
      const header = decode(parts[0]), claims = decode(parts[1])
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !/^[\w-]{1,128}$/.test(header.kid) ||
          header.crit !== undefined || !/^[A-Za-z0-9_-]+$/.test(parts[2])) throw new AdminAuthError('invalid-token')
      const values = await certificates()
      if (!Object.hasOwn(values, header.kid)) throw new AdminAuthError('invalid-token')
      const key = createPublicKey(values[header.kid])
      if (key.asymmetricKeyType !== 'rsa' || !verifySignature('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'))) throw new AdminAuthError('invalid-token')
      const time = Math.floor(now().getTime() / 1000)
      if (!Number.isSafeInteger(time) || !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.auth_time) ||
          Number(claims.exp) <= time || Number(claims.iat) > time || Number(claims.auth_time) > Number(claims.iat) || Number(claims.auth_time) < 0 ||
          Number(claims.exp) <= Number(claims.iat) || claims.aud !== options.projectId || claims.iss !== 'https://securetoken.google.com/' + options.projectId ||
          typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 || claims.email_verified !== true || typeof claims.email !== 'string') throw new AdminAuthError('invalid-token')
      if (!allowed.has(claims.sub)) throw new AdminAuthError('admin-forbidden', 403)
      const firebase = claims.firebase as Record<string, unknown> | undefined
      if (firebase?.sign_in_provider !== 'google.com' || firebase?.tenant !== undefined) throw new AdminAuthError('admin-forbidden', 403)
      if (firebase?.sign_in_second_factor !== 'totp' || typeof firebase.second_factor_identifier !== 'string') throw new AdminAuthError('totp-required', 403)
      // Recheck current account state on every privileged request: no cached authorization.
      const response = await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(options.apiKey), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
        redirect: 'error', signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new AdminAuthError(response.status >= 500 || response.status === 429 ? 'auth-unavailable' : 'invalid-token', response.status >= 500 || response.status === 429 ? 503 : 401)
      const data = await response.json()
      const user = Array.isArray(data?.users) && data.users.length === 1 ? data.users[0] : null
      if (!user || user.localId !== claims.sub || user.disabled === true || user.emailVerified !== true || user.email !== claims.email ||
          typeof user.validSince !== 'string' || !/^\d+$/.test(user.validSince) || Number(claims.auth_time) < Number(user.validSince) ||
          !Array.isArray(user.mfaInfo) || !user.mfaInfo.some((factor: { mfaEnrollmentId?: string; totpInfo?: unknown }) =>
            factor.mfaEnrollmentId === firebase.second_factor_identifier && factor.totpInfo && typeof factor.totpInfo === 'object')) throw new AdminAuthError('invalid-token')
      return { uid: claims.sub, email: claims.email }
    } catch (error) {
      if (error instanceof AdminAuthError) throw error
      throw new AdminAuthError('auth-unavailable', 503)
    }
  }
}
