import { isVisibleGame } from './visibility.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
import type { CatalogGame } from './igdb.ts'
export class GameConfirmationError extends Error {
  readonly code: string
  constructor(code: string) { super(code); this.code = code }
}
export function confirmationId(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'externalId')) throw new GameConfirmationError('invalid-input')
  const id = (input as Record<string, unknown>).externalId
  if (typeof id !== 'string' || !/^[1-9]\d{0,9}$/.test(id)) throw new GameConfirmationError('invalid-input')
  return id
}
export async function confirmGame(input: unknown, dependencies: {
  translateGame?: (id: string) => Promise<void>
  store: AtomicStore; get: (id: string) => Promise<CatalogGame | null>; now: () => Date
}) {
  const externalId = confirmationId(input)
  // Re-fetch selected ID; never trust names or metadata submitted by the visitor.
  const official = await dependencies.get(externalId)
  if (!official) throw new GameConfirmationError('game-not-found')
  if (official.externalId !== externalId || typeof official.officialName !== 'string' || !official.officialName.trim() || official.officialName.length > 500) throw new GameConfirmationError('invalid-catalog')
  const id = 'igdb-' + externalId
  const result = await dependencies.store.transact(async transaction => {
    const existing = await transaction.get('games/' + id)
    if (existing) {
      if (!isVisibleGame(existing) || existing.externalId !== externalId || existing.source !== 'IGDB') throw new GameConfirmationError('game-unavailable')
      return { id, name: String(existing.officialName), created: false }
    }
    transaction.create('games/' + id, {
      externalId, source: 'IGDB', officialName: official.officialName.trim(),
      description: official.description, aliases: official.aliases, genres: official.genres,
      gameModes: official.gameModes, platforms: official.platforms, releaseDate: official.releaseDate,
      imageUrl: official.imageUrl, sourceUrl: official.sourceUrl, status: 'active', createdAt: dependencies.now(),
    })
    return { id, name: official.officialName.trim(), created: true }
  })
  if (dependencies.translateGame) {
    try { await dependencies.translateGame(id) } catch { /* Translation cannot undo a confirmed game. */ }
  }
  return result
}
