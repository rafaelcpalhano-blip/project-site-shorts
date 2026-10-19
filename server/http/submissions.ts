import { validateSubmissionInput } from '../../src/lib/validation/public-input.ts'
import { submitShort, SubmissionError } from '../submissions/submit-short.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'

export interface SubmissionHttpDependencies extends SubmissionDependencies {
  // Explicit deployment origin; do not derive trust from Host or forwarded headers.
  origin: string
  // Must verify a signed identity. Never return an unchecked cookie/header value.
  resolveVisitor: (request: Request) => Promise<string | null>
}
const maximumBodyBytes = 8192
function response(status: number, body: unknown, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra,
  } })
}
class BodyError extends Error {
  readonly status: number
  constructor(status: number) { super('invalid-body'); this.status = status }
}
async function readInput(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maximumBodyBytes)) throw new BodyError(413)
  if (!request.body) throw new BodyError(400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximumBodyBytes) {
        await reader.cancel()
        throw new BodyError(413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
  catch { throw new BodyError(400) }
}
const publicErrors: Record<string, { status: number; message: string }> = {
  'duplicate-video': { status: 409, message: 'Este vídeo já foi enviado.' },
  'daily-limit': { status: 429, message: 'Você atingiu o limite de cinco publicações hoje.' },
  'invalid-game': { status: 422, message: 'Selecione um jogo disponível no catálogo.' },
  'video-not-found': { status: 422, message: 'O vídeo não foi encontrado.' },
  'not-a-short': { status: 422, message: 'O vídeo não possui um formato curto aceito.' },
  'abuse-limit': { status: 429, message: 'Muitas tentativas. Aguarde antes de tentar novamente.' },
}

// Mount only after configuring signed identity, abuse protection and real verification.
// Missing configuration deliberately keeps writes unavailable.
export async function handleSubmission(request: Request, dependencies?: SubmissionHttpDependencies): Promise<Response> {
  if (request.method !== 'POST') return response(405, { error: 'method-not-allowed' }, { Allow: 'POST' })
  if (!dependencies) return response(503, { error: 'unavailable', message: 'Publicação temporariamente indisponível.' })
  if (request.headers.get('origin') !== dependencies.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return response(403, { error: 'invalid-origin' })
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response(415, { error: 'unsupported-media-type' })
  }
  if (request.headers.has('content-encoding')) return response(415, { error: 'unsupported-content-encoding' })
  try {
    const visitor = await dependencies.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return response(401, { error: 'invalid-session' })
    const input = await readInput(request)
    try { validateSubmissionInput(input) }
    catch { return response(400, { error: 'invalid-input', message: 'Confira o link, o jogo e o nome do canal.' }) }
    const result = await submitShort(input, visitor, dependencies)
    return response(result.status === 'published' ? 201 : 202, result)
  } catch (error) {
    if (error instanceof BodyError) return response(error.status, { error: 'invalid-body' })
    if (error instanceof SubmissionError && publicErrors[error.code]) {
      const detail = publicErrors[error.code]
      return response(detail.status, { error: error.code, message: detail.message,
        ...(error.code === 'duplicate-video' && error.publicShortId ? { publicShortId: error.publicShortId } : {}),
      })
    }
    // Never expose tokens, provider responses, stack traces or private document paths.
    return response(503, { error: 'unavailable', message: 'Não foi possível concluir o envio. Tente novamente mais tarde.' })
  }
}
