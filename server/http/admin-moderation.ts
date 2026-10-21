import { loadGameCatalog, loadCatalogGame, moderateCatalogGame } from '../games/admin-catalog.ts'
import { GameNameError } from '../games/name-keys.ts'
import { loadGameRequests, reviewGameRequest } from '../games/requests.ts'
import { loadCommentQueue, loadCommentDetail } from '../comments/queue.ts'
import { parseCommentReview, reviewComment } from '../comments/review-comment.ts'
import type { AdminConfiguration } from './admin.ts'
import { AdminAuthError } from '../auth/firebase-admin.ts'
import { BodyError, readInput } from './submissions.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
import { loadQueue, loadDetail } from '../moderation/queue.ts'
import { parseReview, reviewShort, ReviewError } from '../moderation/review-short.ts'
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
} })
export async function handleAdminModeration(request: Request, options: {
  origin: string; admin?: AdminConfiguration; checkAbuse: (request: Request) => Promise<boolean>
  store: SubmissionDependencies['store']; now: () => Date; verify: SubmissionDependencies['verify']
}) {
  if (request.method !== 'POST') return reply(405, { error: 'method-not-allowed' })
  if (request.headers.get('origin') !== options.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'invalid-origin' })
  if (!options.admin) return reply(503, { error: 'admin-not-configured' })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || request.headers.has('content-encoding')) return reply(415, { error: 'unsupported-media-type' })
  try {
    if (!await options.checkAbuse(request)) return reply(429, { error: 'abuse-limit' })
    const admin = await options.admin.authorize(request)
    const input = await readInput(request)
    const path = new URL(request.url).pathname
    if (path === '/api/admin/games/catalog') return reply(200, await loadGameCatalog(input, options.store))
    if (path === '/api/admin/games/detail') return reply(200, await loadCatalogGame(input, options.store))
    if (path === '/api/admin/games/moderate') return reply(200, await moderateCatalogGame(input, admin.uid, options))
    if (path === '/api/admin/games/queue') return reply(200, await loadGameRequests(input, options.store))
    if (path === '/api/admin/games/review') return reply(200, await reviewGameRequest(input, admin.uid, options))
    if (path === '/api/admin/comments/queue') return reply(200, await loadCommentQueue(input, options.store))
    if (path === '/api/admin/comments/detail') return reply(200, await loadCommentDetail(input, options.store))
    if (path === '/api/admin/comments/review') return reply(200, await reviewComment(parseCommentReview(input), admin.uid, options))
    if (path === '/api/admin/queue') return reply(200, await loadQueue(input, options.store))
    if (path === '/api/admin/detail') return reply(200, await loadDetail(input, options.store))
    if (path === '/api/admin/review') return reply(200, await reviewShort(parseReview(input), admin.uid, options))
    return reply(404, { error: 'not-found' })
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, { error: 'invalid-body' })
    if (error instanceof GameNameError) return reply(error.status, {error:error.message})
    if (error instanceof ReviewError) return reply(error.status, { error: error.message })
    if (error instanceof AdminAuthError) return reply(error.status, { error: error.message })
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
