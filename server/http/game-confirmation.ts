import { GameNameError } from '../games/name-keys.ts'
import { BodyError, readInput } from './submissions.ts'
import { confirmGame, GameConfirmationError } from '../games/confirm-game.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
import type { CatalogGame } from '../games/igdb.ts'
export interface GameConfirmationDependencies {
  translateGame?: (id: string) => Promise<void>
  origin: string; store: AtomicStore; now: () => Date
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
  get: (id: string) => Promise<CatalogGame | null>
}
function reply(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'POST' } : {}) } })
}
export async function handleGameConfirmation(request: Request, dependencies?: GameConfirmationDependencies) {
  if (request.method !== 'POST') return reply(405, { error: 'method-not-allowed' })
  if (!dependencies) return reply(503, { error: 'unavailable' })
  if (request.headers.get('origin') !== dependencies.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'invalid-origin' })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || request.headers.has('content-encoding')) return reply(415, { error: 'unsupported-media-type' })
  try {
    const visitor = await dependencies.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return reply(401, { error: 'invalid-session' })
    await dependencies.checkAbuse(visitor)
    const result = await confirmGame(await readInput(request), dependencies)
    return reply(result.created ? 201 : 200, result)
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, { error: 'invalid-body' })
    if (error instanceof GameNameError) return reply(error.status, {error:error.message})
    if (error instanceof GameConfirmationError) {
      const statuses: Record<string, number> = { 'invalid-input': 400, 'game-not-found': 404, 'game-unavailable': 409 }
      return reply(statuses[error.code] || 503, { error: statuses[error.code] ? error.code : 'unavailable' })
    }
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
