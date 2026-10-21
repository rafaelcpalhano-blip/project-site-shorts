import { mapGameDetails } from '../../features/games/services/game-details.ts'
import type { GameDetails } from '../../features/games/services/game-details.ts'
import {
  collection, doc, getDocFromServer, getDocsFromServer, query, where, orderBy,
  documentId, limit, startAfter,
} from 'firebase/firestore'
import type { Firestore, QueryConstraint, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import type { Game, Short } from '../../features/shorts/types/models.ts'

export type Cursor = QueryDocumentSnapshot<DocumentData>
export interface Page<T> { items: T[]; next: Cursor | null }
export interface PublicComment { id: string; content: string; createdAt: number }
function requiredString(data: DocumentData, field: string): string {
  if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error('Registro inválido: ' + field)
  return data[field]
}
function timestamp(data: DocumentData): number {
  if (!data.createdAt || typeof data.createdAt.toMillis !== 'function') throw new Error('Data inválida')
  return data.createdAt.toMillis()
}
function mapGame(snapshot: Cursor): Game {
  return { id: snapshot.id, name: requiredString(snapshot.data(), 'officialName') }
}
function mapShort(snapshot: Cursor): Short {
  const data = snapshot.data()
  const platform = requiredString(data, 'platform')
  if (!['YouTube', 'TikTok', 'Twitch'].includes(platform)) throw new Error('Plataforma inválida')
  return {
    id: snapshot.id, identity: platform + ':' + requiredString(data, 'platformVideoId'),
    url: requiredString(data, 'normalizedUrl'), platform,
    title: requiredString(data, 'title'), channelName: typeof data.channelName === 'string' ? data.channelName : '',
    gameId: requiredString(data, 'gameId'), createdAt: timestamp(data),
  }
}
async function page<T>(database: Firestore, name: string, constraints: QueryConstraint[], size: number, map: (doc: Cursor) => T): Promise<Page<T>> {
  const result = await getDocsFromServer(query(collection(database, name), ...constraints, limit(size + 1)))
  const visible = result.docs.slice(0, size)
  return { items: visible.map(map), next: result.docs.length > size ? visible[visible.length - 1] : null }
}
export function createPublicRepository(database: Firestore) {
  return {
    listShorts: (gameId?: string, cursor?: Cursor) => page(database, 'shorts', [
      where('moderationStatus', '==', 'published'),
      ...(gameId ? [where('gameId', '==', gameId)] : []),
      orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
    ], 15, mapShort),
    listGames: (cursor?: Cursor) => page(database, 'games', [
      where('status', '==', 'active'), orderBy('officialName'), orderBy(documentId()),
      ...(cursor ? [startAfter(cursor)] : []),
    ], 50, mapGame),
    getGame: async (id: string): Promise<GameDetails | null> => {
      if (!id || id.includes('/')) throw new Error('Identificador de jogo inválido')
      const result = await getDocFromServer(doc(database, 'games', id))
      return result.exists() ? mapGameDetails(result.id, result.data()) : null
    },
    listComments: (shortId: string, cursor?: Cursor) => page(database, 'comments', [
      where('shortId', '==', shortId), where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
    ], 20, snapshot => ({ id: snapshot.id, content: requiredString(snapshot.data(), 'content'), createdAt: timestamp(snapshot.data()) })),
  }
}

