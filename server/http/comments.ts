import { BodyError, readInput } from './submissions.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import { validateCommentSubmission } from '../../src/lib/validation/comment-input.ts'
import { CommentError, submitComment } from '../comments/submit-comment.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
interface Dependencies {
  origin: string; store: AtomicStore; now: () => Date
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
}
const reply = (status: number, body: unknown) => Response.json(body, {status, headers:{
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...(status === 405 ? {Allow:'POST'} : {}),
}})
export async function handleComment(request: Request, options?: Dependencies) {
  if (request.method !== 'POST') return reply(405, {error:'method-not-allowed'})
  if (!options) return reply(503, {error:'unavailable'})
  if (request.headers.get('origin') !== options.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, {error:'invalid-origin'})
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || request.headers.has('content-encoding')) return reply(415, {error:'unsupported-media-type'})
  try {
    const visitor = await options.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return reply(401, {error:'invalid-session'})
    await options.checkAbuse(visitor)
    const input = await readInput(request)
    try { validateCommentSubmission(input) } catch { return reply(400, {error:'invalid-input'}) }
    const result = await submitComment(input, visitor, options)
    return reply(result.repeated ? 200 : result.status === 'approved' ? 201 : 202, result)
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, {error:'invalid-body'})
    if (error instanceof CommentError) return reply(error.status, {error:error.message})
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, {error:'abuse-limit'})
    return reply(503, {error:'unavailable'})
  }
}
