import { validateGameRequestInput } from '../../../lib/validation/public-input.ts'
export interface OfficialGame { externalId: string; officialName: string; releaseDate: string | null; platforms: string[] }
export function createGameCatalogClient(fetcher: typeof fetch = fetch) {
  async function call(path: string, method: 'GET' | 'POST', body?: unknown) {
    const response = await fetcher(path, { method, credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) {
      let code = ''
      try { code = (await response.json()).error } catch { /* No provider details displayed. */ }
      const messages: Record<string, string> = { 'abuse-limit': 'Muitas consultas. Aguarde antes de tentar novamente.',
        'game-not-found': 'O jogo não foi encontrado no catálogo oficial.', 'game-unavailable': 'Este jogo não está disponível para cadastro.' }
      throw new Error(messages[code] || 'Catálogo indisponível no momento. Seus campos foram preservados.')
    }
    return response
  }
  return {
    async search(value: string): Promise<OfficialGame[]> {
      const { name } = validateGameRequestInput({ name: value })
      await call('/api/session', 'POST')
      const result = await (await call('/api/games/search?q=' + encodeURIComponent(name), 'GET')).json()
      if (!Array.isArray(result?.games) || result.games.length > 10 || result.games.some((game: OfficialGame) =>
        !game || typeof game.externalId !== 'string' || !/^[1-9]\d{0,9}$/.test(game.externalId) || typeof game.officialName !== 'string' || !game.officialName.trim() || game.officialName.length > 500 ||
        (game.releaseDate !== null && typeof game.releaseDate !== 'string') || !Array.isArray(game.platforms) || game.platforms.some(platform => typeof platform !== 'string'))) throw new Error('Resposta de catálogo inválida.')
      return result.games
    },
    async confirm(externalId: string): Promise<{ id: string; name: string }> {
      if (!/^[1-9]\d{0,9}$/.test(externalId)) throw new Error('Selecione um jogo válido.')
      await call('/api/session', 'POST')
      const response = await call('/api/games/confirm', 'POST', { externalId })
      const result = await response.json()
      if (![200, 201].includes(response.status) || result?.id !== 'igdb-' + externalId || typeof result.name !== 'string' || !result.name.trim() || result.name.length > 500) throw new Error('Não foi possível confirmar o jogo. Consulte o catálogo antes de tentar novamente.')
      return { id: result.id, name: result.name }
    },
  }
}
