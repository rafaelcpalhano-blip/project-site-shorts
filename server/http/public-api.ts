import { createVisitorIdentity } from '../security/visitor-identity.ts'
import { createAttemptLimiter } from '../security/attempt-limit.ts'
import { handleSession } from './session.ts'
import { handleSubmission } from './submissions.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
export interface PublicApiOptions {
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
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname
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
