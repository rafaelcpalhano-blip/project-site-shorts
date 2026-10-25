import { validateGameRequestInput } from '../../src/lib/validation/public-input.ts'
export interface CatalogGame {
  externalId: string; officialName: string; description: string; aliases: string[]
  genres: string[]; gameModes: string[]; platforms: string[]
  releaseDate: string | null; imageUrl: string | null; sourceUrl: string | null
}
interface Credentials { clientId: string; clientSecret: string }
type Fetch = typeof fetch
function strings(value: unknown, key: string): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => item && typeof item[key] === 'string' ? [item[key]] : [])
}
function safeUrl(value: unknown, hostname: string): string | null {
  if (typeof value !== 'string') return null
  try {
    const parsed = new URL(value.startsWith('//') ? 'https:' + value : value)
    return parsed.protocol === 'https:' && parsed.hostname === hostname && !parsed.username && !parsed.password ? parsed.href : null
  } catch { return null }
}
export function createIgdbCatalog(credentials: Credentials, fetcher: Fetch = fetch) {
  if (!credentials.clientId || !credentials.clientSecret) throw new Error('Credenciais Twitch/IGDB não configuradas')
  let cached: { token: string; expiresAt: number } | undefined
  let pending: Promise<string> | undefined
  const token = async (): Promise<string> => {
    if (cached && cached.expiresAt > Date.now()) return cached.token
    if (pending) return pending
    pending = (async () => {
      const response = await fetcher('https://id.twitch.tv/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, grant_type: 'client_credentials' }),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      })
      if (!response.ok) throw new Error('Não foi possível autenticar o catálogo de jogos')
      const result = await response.json()
      if (typeof result.access_token !== 'string' || typeof result.expires_in !== 'number') throw new Error('Resposta de autenticação inválida')
      cached = { token: result.access_token, expiresAt: Date.now() + Math.max(0, result.expires_in - 60) * 1000 }
      return cached.token
    })()
    try { return await pending } finally { pending = undefined }
  }
  const query = async (condition: string): Promise<CatalogGame[]> => {
    const response = await fetcher('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': credentials.clientId, Authorization: 'Bearer ' + await token(), 'Content-Type': 'text/plain' },
      body: 'fields name,summary,alternative_names.name,genres.name,game_modes.name,platforms.name,first_release_date,cover.url,url; ' + condition,
      signal: AbortSignal.timeout(10000), redirect: 'error',
    })
    if (response.status === 401) cached = undefined
    if (!response.ok) throw new Error('Catálogo temporariamente indisponível')
    const result: unknown = await response.json()
    if (!Array.isArray(result)) throw new Error('Resposta de catálogo inválida')
    return result.flatMap(item => {
      if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== 'string' || !item.name.trim()) return []
      const release = typeof item.first_release_date === 'number' ? new Date(item.first_release_date * 1000) : null
      return [{
        externalId: String(item.id), officialName: item.name, description: typeof item.summary === 'string' ? item.summary : '',
        aliases: strings(item.alternative_names, 'name'), genres: strings(item.genres, 'name'),
        gameModes: strings(item.game_modes, 'name'), platforms: strings(item.platforms, 'name'),
        releaseDate: release && Number.isFinite(release.getTime()) ? release.toISOString().slice(0, 10) : null,
        imageUrl: safeUrl(item.cover?.url, 'images.igdb.com'), sourceUrl: safeUrl(item.url, 'www.igdb.com'),
      }]
    })
  }
  return {
    // Server-only token provider shared with Helix; never serialize to clients.
    accessToken: token,
    async search(value: string, offset = 0) {
      const { name } = validateGameRequestInput({ name: value })
      if(!Number.isSafeInteger(offset)||offset<0||offset%10!==0||offset>Number.MAX_SAFE_INTEGER-10)throw new Error('Página IGDB inválida')
      // Escape the quoted API search literal; never accept arbitrary IGDB query syntax.
      const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return query('search "' + escaped + '"; limit 11; offset '+offset+';')
    },
    async get(externalId: string) {
      if (!/^[1-9]\d{0,9}$/.test(externalId)) throw new Error('Identificador IGDB inválido')
      return (await query('where id = ' + externalId + '; limit 1;')).find(game => game.externalId === externalId) || null
    },
  }
}


