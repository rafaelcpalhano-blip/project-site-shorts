import { SubmissionError } from '../submissions/submit-short.ts'
import { AdminAuthError } from '../auth/firebase-admin.ts'
export interface AdminConfiguration {
  publicConfig: { apiKey: string; authDomain: string; projectId: string; appId: string }
  authorize: (request: Request) => Promise<{ uid: string; email: string }>
}
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
} })
export async function handleAdmin(request: Request, origin: string, options?: AdminConfiguration, checkAbuse?: (request: Request) => Promise<boolean>) {
  const config = new URL(request.url).pathname === '/api/admin/config'
  if (request.method !== (config ? 'GET' : 'POST')) return reply(405, { error: 'method-not-allowed' })
  if ((request.headers.get('origin') && request.headers.get('origin') !== origin) || (!config && request.headers.get('origin') !== origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'invalid-origin' })
  if (!options) return reply(503, { error: 'admin-not-configured' })
  if (config) return reply(200, options.publicConfig)
  try {
    if (!checkAbuse || !await checkAbuse(request)) return reply(429, { error: 'abuse-limit' })
    const admin = await options.authorize(request)
    return reply(200, { authenticated: true, ...admin })
  } catch (error) {
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return error instanceof AdminAuthError ? reply(error.status, { error: error.message }) : reply(503, { error: 'auth-unavailable' })
  }
}
