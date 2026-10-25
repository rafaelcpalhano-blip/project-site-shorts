import { validateGameRequestInput } from '../../src/lib/validation/public-input.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { CatalogGame } from '../games/igdb.ts'
export interface GameSearchDependencies {
  origin: string
  resolveVisitor: (request: Request) => Promise<string | null>
  checkAbuse: (visitor: string) => Promise<void>
  search: (name: string, offset?:number) => Promise<CatalogGame[]>
}
function reply(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'GET' } : {}),
  } })
}
export async function handleGameSearch(request: Request, dependencies?: GameSearchDependencies): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'method-not-allowed' })
  if (!dependencies) return reply(503, { error: 'unavailable' })
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  // Same-origin browser GETs may omit Origin. Reject cross-origin browser traffic.
  if ((origin !== null && origin !== dependencies.origin) || (site !== null && site !== 'same-origin')) return reply(403, { error: 'invalid-origin' })
  const url = new URL(request.url)
  if (url.search.length > 2048 || [...url.searchParams.keys()].some(key => key !== 'q' && key !== 'cursor') || url.searchParams.getAll('q').length !== 1) return reply(400, { error: 'invalid-query' })
  const rawCursor=url.searchParams.get('cursor'),offset=rawCursor===null?0:Number(rawCursor)
  if(url.searchParams.getAll('cursor').length>1||rawCursor!==null&&!/^(0|[1-9]\d*)$/.test(rawCursor)||!Number.isSafeInteger(offset)||offset<0||offset%10!==0||offset>Number.MAX_SAFE_INTEGER-10)return reply(400,{error:'invalid-query'})
  let name: string
  try { name = validateGameRequestInput({ name: url.searchParams.get('q') }).name }
  catch { return reply(400, { error: 'invalid-query' }) }
  try {
    const visitor = await dependencies.resolveVisitor(request)
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) return reply(401, { error: 'invalid-session' })
    await dependencies.checkAbuse(visitor)
    const games = await dependencies.search(name,offset)
    // Return only display/selection fields, never adapter state or credentials.
    return reply(200, { games: games.slice(0, 10).map(game => ({ externalId: game.externalId,
      officialName: game.officialName, releaseDate: game.releaseDate, platforms: game.platforms,
    })), next:games.length>10?offset+10:null, source: 'IGDB', sourceUrl: 'https://www.igdb.com/' })
  } catch (error) {
    if (error instanceof SubmissionError && error.code === 'abuse-limit') return reply(429, { error: 'abuse-limit' })
    return reply(503, { error: 'unavailable' })
  }
}
