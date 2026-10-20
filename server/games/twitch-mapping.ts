import type { AtomicStore } from '../firestore/atomic-store.ts'
// Resolve only from a stored, active IGDB record; names and visitor IDs are not evidence.
export function createTwitchGameResolver(options: {
  store: AtomicStore; clientId: string; accessToken: () => Promise<string>; fetcher?: typeof fetch
}) {
  const fetcher = options.fetcher ?? fetch
  return async (gameId: string): Promise<string | null> => {
    if (!/^igdb-[1-9]\d{0,9}$/.test(gameId)) return null
    try {
      const game = await options.store.transact(tx => tx.get('games/' + gameId))
      if (!game || game.status !== 'active' || game.source !== 'IGDB' ||
          typeof game.externalId !== 'string' || gameId !== 'igdb-' + game.externalId) return null
      const endpoint = new URL('https://api.twitch.tv/helix/games')
      endpoint.searchParams.set('igdb_id', game.externalId)
      const response = await fetcher(endpoint, {
        headers: { 'Client-ID': options.clientId, Authorization: 'Bearer ' + await options.accessToken() },
        redirect: 'error', signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const result = await response.json()
      if (!Array.isArray(result?.data) || result.data.length !== 1) return null
      const match = result.data[0]
      return match?.igdb_id === game.externalId && typeof match.id === 'string' && /^[1-9]\d*$/.test(match.id) ? match.id : null
    } catch { return null }
  }
}
