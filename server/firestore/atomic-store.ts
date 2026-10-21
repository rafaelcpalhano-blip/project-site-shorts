export type RecordData = Record<string, unknown>
export interface AtomicTransaction {
  get(path: string): Promise<RecordData | null>
  create(path: string, data: RecordData): void
  set(path: string, data: RecordData): void
}
export interface StoreQuery {
  collection: 'gameRequests' | 'comments' | 'shorts' | 'reportSummaries' | 'reports' | 'moderationLogs'
  filter: { field: string; value: string }
  orderBy: string
  limit: number
  cursor?: { time: string; id: string }
}
export interface SearchShortsQuery {fragment:string;gameId?:string;cursor?:{time:string;id:string};limit:number}
export interface PublicPageQuery { kind: 'shorts' | 'comments'; parentId?: string; cursor?: {time:string;id:string}; limit: number }
export type GameCatalogFilter = 'all' | 'active' | 'provisional' | 'hidden' | 'banned'
export interface GameCatalogQuery {filter:GameCatalogFilter;cursor?:{time:string;id:string};limit:number}
export interface AtomicStore {
  gameCatalogPage?: (query:GameCatalogQuery)=>Promise<Array<{id:string;data:RecordData}>>
  countGameShorts?: (gameId:string)=>Promise<number>
  scanGames?: (after?:string)=>Promise<Array<{id:string;data:RecordData}>>
  get?: (path: string) => Promise<RecordData | null>
  publicPage?: (query: PublicPageQuery) => Promise<Array<{id:string;data:RecordData}>>
  searchShorts?: (query:SearchShortsQuery)=>Promise<Array<{id:string;data:RecordData}>>
  scanShorts?: (after?:string)=>Promise<Array<{id:string;data:RecordData}>>
  query?: (query: StoreQuery) => Promise<Array<{ id: string; data: RecordData }>>
  transact<T>(work: (transaction: AtomicTransaction) => Promise<T>): Promise<T>
}

