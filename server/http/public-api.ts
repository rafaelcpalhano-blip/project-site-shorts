import { handleGameRequest } from './game-requests.ts'
import { handleComment } from './comments.ts'
import { handleAdminModeration } from './admin-moderation.ts'
import { handleAdmin } from './admin.ts'
import type { AdminConfiguration } from './admin.ts'
import { handleReport } from './reports.ts'
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
  gameTranslation?: (id: string) => Promise<void>
  admin?: AdminConfiguration
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
  const adminLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'admin-auth' })
  const reportLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'report' })
  const gameRequestLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'game-request' })
  const commentLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'comment' })
  const previewLimit = createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.maximumAttempts, windowMs: options.attemptWindowMs, scope: 'video-preview' })
  const searchLimit = options.gameSearch ? createAttemptLimiter({ store: options.store, now: options.now,
    maximum: options.gameSearch.maximumAttempts, windowMs: options.gameSearch.windowMs, scope: 'game-search' }) : undefined
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname
    if (path === '/api/admin/config' || path === '/api/admin/session') return handleAdmin(request, options.origin, options.admin, async candidate => {
      const visitor = await identity.resolveVisitor(candidate)
      if (!visitor) return false
      await adminLimit(visitor)
      return true
    })
    if (['/api/admin/games/queue', '/api/admin/games/review', '/api/admin/queue', '/api/admin/detail', '/api/admin/review', '/api/admin/comments/queue', '/api/admin/comments/detail', '/api/admin/comments/review'].includes(path)) return handleAdminModeration(request, {
      origin: options.origin, admin: options.admin, store: options.store, now: options.now, verify: options.verify,
      checkAbuse: async candidate => {
        const visitor = await identity.resolveVisitor(candidate)
        if (!visitor) return false
        await adminLimit(visitor)
        return true
      },
    })
    if (path === '/api/games/requests') return handleGameRequest(request, {
      origin: options.origin, store: options.store, now: options.now, resolveVisitor: identity.resolveVisitor, checkAbuse: gameRequestLimit,
    })
    if (path === '/api/comments') return handleComment(request, {
      origin: options.origin, store: options.store, now: options.now, resolveVisitor: identity.resolveVisitor, checkAbuse: commentLimit,
    })
    if (path === '/api/reports') return handleReport(request, {
      origin: options.origin, store: options.store, now: options.now, resolveVisitor: identity.resolveVisitor, checkAbuse: reportLimit,
    })
    if (path === '/api/shorts/preview') return handleVideoPreview(request, {
      origin: options.origin, resolveVisitor: identity.resolveVisitor, checkAbuse: previewLimit, verify: options.verify,
    })
    if (path === '/api/games/confirm') return handleGameConfirmation(request, options.gameSearch?.get && searchLimit ? {
      origin: options.origin, store: options.store, now: options.now, resolveVisitor: identity.resolveVisitor,
      checkAbuse: searchLimit, get: options.gameSearch.get, translateGame: options.gameTranslation,
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
