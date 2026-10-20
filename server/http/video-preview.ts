import { BodyError, readInput } from './submissions.ts'
import { validateSubmissionInput, validateVideoTitle } from '../../src/lib/validation/public-input.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
interface Dependencies {
  origin: string
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
  verify: SubmissionDependencies['verify']
}
const reply = (status: number, body: unknown) => Response.json(body, { status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'POST' } : {}) } })
export async function handleVideoPreview(request: Request, dependencies?: Dependencies) {
  if (request.method !== 'POST') return reply(405, { error: 'method-not-allowed' })
  if (!dependencies) return reply(503, { error: 'unavailable' })
  if (request.headers.get('origin') !== dependencies.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'invalid-origin' })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || request.headers.has('content-encoding')) return reply(415, { error: 'unsupported-media-type' })
  try {
    const visitor = await dependencies.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return reply(401, { error: 'invalid-session' })
    await dependencies.checkAbuse(visitor)
    const input = await readInput(request)
    let submission
    try {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'url')) throw new Error('invalid-input')
      submission = validateSubmissionInput({ url: (input as { url?: unknown }).url, gameId: 'preview' })
    } catch { return reply(400, { error: 'invalid-input' }) }
    // Preview has no chosen game and never authorizes publication or reserves a video.
    const evidence = await dependencies.verify(submission)
    if (evidence.existence === 'missing') return reply(404, { error: 'video-not-found' })
    if (evidence.existence !== 'confirmed' || !evidence.title) return reply(503, { error: 'metadata-unavailable' })
    return reply(200, { title: validateVideoTitle(evidence.title) })
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, { error: 'invalid-body' })
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
