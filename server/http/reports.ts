import { BodyError, readInput } from './submissions.ts'
import { validateReportInput } from '../../src/lib/validation/report-input.ts'
import { reportShort, ReportError } from '../reports/report-short.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
interface Dependencies {
  origin: string; store: AtomicStore; now: () => Date
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
}
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'POST' } : {}),
} })
export async function handleReport(request: Request, dependencies?: Dependencies) {
  if (request.method !== 'POST') return reply(405, { error: 'method-not-allowed' })
  if (!dependencies) return reply(503, { error: 'unavailable' })
  if (request.headers.get('origin') !== dependencies.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'invalid-origin' })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || request.headers.has('content-encoding')) return reply(415, { error: 'unsupported-media-type' })
  try {
    const visitor = await dependencies.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return reply(401, { error: 'invalid-session' })
    await dependencies.checkAbuse(visitor)
    const input = await readInput(request)
    try { validateReportInput(input) } catch { return reply(400, { error: 'invalid-input' }) }
    return reply(200, await reportShort(input, visitor, dependencies))
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, { error: 'invalid-body' })
    if (error instanceof ReportError && error.message === 'short-unavailable') return reply(404, { error: 'short-unavailable' })
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
