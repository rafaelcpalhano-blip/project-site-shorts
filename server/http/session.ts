import type { VisitorIdentity } from '../security/visitor-identity.ts'
export interface SessionDependencies {
  origin: string
  identity: VisitorIdentity
  // Trusted admission control must cover new identities, not just existing cookies.
  allowIssuance: (request: Request) => Promise<boolean>
}
function reply(status: number, error?: string, cookie?: string) {
  return new Response(status === 204 ? null : JSON.stringify({ error }), { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(status !== 204 ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { 'Set-Cookie': cookie } : {}),
    ...(status === 405 ? { Allow: 'POST' } : {}),
  } })
}
export async function handleSession(request: Request, dependencies?: SessionDependencies): Promise<Response> {
  if (request.method !== 'POST') return reply(405, 'method-not-allowed')
  if (!dependencies) return reply(503, 'unavailable')
  if (request.headers.get('origin') !== dependencies.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, 'invalid-origin')
  try {
    // __Host- cookies require HTTPS. No insecure fallback is enabled for production.
    if (new URL(dependencies.origin).protocol !== 'https:') return reply(503, 'unavailable')
    // Preserve existing identity and quota. Reopening the form must not rotate cookies.
    if (await dependencies.identity.resolveVisitor(request)) return reply(204)
    if (!await dependencies.allowIssuance(request)) return reply(429, 'abuse-limit')
    return reply(204, undefined, await dependencies.identity.issue())
  } catch { return reply(503, 'unavailable') }
}
