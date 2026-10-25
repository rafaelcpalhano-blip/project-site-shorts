import {createGameCatalogPageCache} from '../../features/games/services/catalog-cache.ts'
import {createPublicReadClient} from './public-read-api.ts'
import type {GameCursor} from './public-read-api.ts'
import type {Firestore} from 'firebase/firestore'
import type {Game} from '../../features/shorts/types/models.ts'
export type {PublicCursor,PublicComment} from './public-read-api.ts'
export type Cursor=GameCursor
export interface Page<T>{items:T[];next:Cursor|null}
const gameCatalogs=new WeakMap<Firestore,(cursor?:Cursor)=>Promise<Page<Game>>>()
export function createPublicRepository(database:Firestore,reads=createPublicReadClient()){
 let listGames=gameCatalogs.get(database)
 if(!listGames){listGames=createGameCatalogPageCache<Cursor>(reads.listGames);gameCatalogs.set(database,listGames)}
 return {listGames,getGame:reads.getGame,listShorts:reads.listShorts,getShort:reads.getShort,listComments:reads.listComments}
}
