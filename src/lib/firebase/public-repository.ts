import {createGameCatalogPageCache} from '../../features/games/services/catalog-cache.ts'
import { createPublicReadClient } from './public-read-api.ts'
export type { PublicCursor, PublicComment } from './public-read-api.ts'
import { mapGameDetails } from '../../features/games/services/game-details.ts'
import type { GameDetails } from '../../features/games/services/game-details.ts'
import {
  collection, doc, getDocFromServer, getDocsFromServer, query, where, orderBy,
  documentId, limit, startAfter,
} from 'firebase/firestore'
import type { Firestore, QueryConstraint, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import type { Game } from '../../features/shorts/types/models.ts'

export type Cursor = QueryDocumentSnapshot<DocumentData>
export interface Page<T> { items: T[]; next: Cursor | null }
function requiredString(data: DocumentData, field: string): string {
  if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error('Registro inválido: ' + field)
  return data[field]
}
function mapGame(snapshot: Cursor): Game {
  return { id: snapshot.id, name: requiredString(snapshot.data(), 'officialName') }
}
async function page<T>(database: Firestore, name: string, constraints: QueryConstraint[], size: number, map: (doc: Cursor) => T): Promise<Page<T>> {
  const result = await getDocsFromServer(query(collection(database, name), ...constraints, limit(size + 1)))
  const visible = result.docs.slice(0, size)
  return { items: visible.map(map), next: result.docs.length > size ? visible[visible.length - 1] : null }
}
const gameCatalogs=new WeakMap<Firestore,(cursor?:Cursor)=>Promise<Page<Game>>>()
export function createPublicRepository(database: Firestore, reads = createPublicReadClient()) {
  let listGames=gameCatalogs.get(database)
  if(!listGames){
    listGames=createGameCatalogPageCache<Cursor>(cursor=>page(database,'games',[
      where('status','==','active'),orderBy('officialName'),orderBy(documentId()),
      ...(cursor?[startAfter(cursor)]:[]),
    ],50,mapGame))
    gameCatalogs.set(database,listGames)
  }
  return {
    listShorts: reads.listShorts,
    getShort: reads.getShort,
    listGames,
    getGame: async (id: string): Promise<GameDetails | null> => {
      if (!id || id.includes('/')) throw new Error('Identificador de jogo inválido')
      const result = await getDocFromServer(doc(database, 'games', id))
      return result.exists() ? mapGameDetails(result.id, result.data()) : null
    },
    listComments: reads.listComments,
  }
}
