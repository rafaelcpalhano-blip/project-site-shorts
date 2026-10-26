import {retryAfterSeconds} from '../videos/tiktok-availability.ts'
import {resolveSharedVideoUrl} from '../videos/resolve-shared-url.ts'
import {sharedVideoInput} from '../../src/lib/validation/shared-video-url.ts'
import { BodyError, readInput } from './submissions.ts'
import { validateSubmissionInput, validateVideoTitle, validateChannelName } from '../../src/lib/validation/public-input.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { SubmissionDependencies } from '../submissions/submit-short.ts'
interface Dependencies {
  origin: string
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
  verify: SubmissionDependencies['verify']
  resolveUrl?: (url:string)=>Promise<string>
}
const reply = (status: number, body: unknown,extra:Record<string,string>={}) => Response.json(body, { status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'POST' } : {}),...extra } })
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
    let link:string
    try {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'url')) throw new Error('invalid-input')
      const value=(input as {url?:unknown}).url
      if(typeof value!=='string')throw Error('invalid-input')
      link=sharedVideoInput(value).url
    } catch { return reply(400, { error: 'invalid-input' }) }
    const resolved=await (dependencies.resolveUrl??resolveSharedVideoUrl)(link)
    const submission=validateSubmissionInput({url:resolved,gameId:'preview'})
    if(new URL(request.url).pathname==='/api/shorts/resolve')return reply(200,{url:submission.url})
    // Preview has no chosen game and never authorizes publication or reserves a video.
    const evidence = await dependencies.verify(submission)
    if (evidence.existence === 'missing') return reply(404, { error: 'video-not-found' })
    if (evidence.existence !== 'confirmed') {
      const limited=submission.platform==='TikTok'&&evidence.unavailableReason==='provider-rate-limited',waiting=limited?retryAfterSeconds(evidence.retryAfterSeconds):undefined
      return reply(503, { error: limited?'source-rate-limited':'metadata-unavailable' },waiting?{'Retry-After':String(waiting)}:{})
    }
    let channelName = ''
    try { channelName = validateChannelName(evidence.channelName) } catch { /* Ignore unusable optional names. */ }
    const channel = channelName ? { channelName } : {}
    // A valid TikTok oEmbed may omit title/thumbnail entirely. Absence is not a service failure.
    if (!evidence.title) return submission.platform === 'TikTok' ? reply(200, { title: null, ...channel }) : reply(503, { error: 'metadata-unavailable' })
    return reply(200, { title: validateVideoTitle(evidence.title), ...channel })
  } catch (error) {
    if (error instanceof BodyError) return reply(error.status, { error: 'invalid-body' })
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
