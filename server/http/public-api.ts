import { handleVideoPreview } from './video-preview.ts'
import { handleGameConfirmation } from './game-confirmation.ts'
import { handleGameSearch } from './game-search.ts'
import type { CatalogGame } from '../games/igdb.ts'
import { createVisitorIdentity } from '../security/visitor-identity.ts'
import { createAttemptLimiter } from '../security/attempt-limit.ts'
import { handleSession } from './session.ts'
import { handleSubmission } from './submissions.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
export interface PublicApiOptions {
  gameSearch?: { get?: (id: string) => Promise<CatalogGame | null>; search: (name: string) => Promise<CatalogGame[]>; maximumAttempts: number; windowMs: number }
  origin: string
  visitorSecret: string
  store: SubmissionDependencies['store']
  verify: SubmissionDependencies['verify']
  now: () => Date
  maximumAttempts: number
  attemptWindowMs: number
  allowSessionIssuance: (request: Request) => Promise<boolean>
}
// Server composition only. No Cloudflare binding or browser endpoint is enabled here.
export async function createPublicApi(options: PublicApiOptions) {
  const origin = new URL(options.origin)
  if (origin.protocol !== 'https:' || origin.origin !== options.origin) throw new Error('Expected canonical HTTPS origin')
  const identity = await createVisitorIdentity(options.visitorSecret, options.now)
  const checkAbuse = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs })
  const previewLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'video-preview' })
  const searchLimit = options.gameSearch ? createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.gameSearch.maximumAttempts, windowMs: options.gameSearch.windowMs, scope: 'game-search' }) : undefined
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname
    if (path === '/api/shorts/preview') return handleVideoPreview(request, {
      origin: options.origin, resolveVisitor: identity.resolveVisitor, checkAbuse: previewLimit, verify: options.verify,
    })
    if (path === '/api/games/confirm') return handleGameConfirmation(request, options.gameSearch?.get && searchLimit ? {
      origin: options.origin, store: options.store, now: options.now, resolveVisitor: identity.resolveVisitor,
      checkAbuse: searchLimit, get: options.gameSearch.get,
    } : undefined)
    if (path === '/api/games/search') return handleGameSearch(request, options.gameSearch && searchLimit ? {
      origin: options.origin, resolveVisitor: identity.resolveVisitor, checkAbuse: searchLimit, search: options.gameSearch.search,
    } : undefined)
    if (path === '/api/session') return handleSession(request, {
      origin: options.origin, identity, allowIssuance: options.allowSessionIssuance,
    })
    if (path === '/api/shorts') return handleSubmission(request, {
      origin: options.origin, store: options.store, verify: options.verify, now: options.now,
      resolveVisitor: identity.resolveVisitor, checkAbuse,
    })
    return Response.json({ error: 'not-found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }
}

