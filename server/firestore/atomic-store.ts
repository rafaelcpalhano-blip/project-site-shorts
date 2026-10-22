import type {AdminSort,AdminListCursor} from '../../src/features/admin/types/list-order.ts'
export type RecordData = Record<string, unknown>
export interface AtomicTransaction {
  hasPublishedComment?(shortId: string): Promise<boolean>
  publishedCommentHistory?(shortId:string): Promise<Array<{id:string;data:RecordData}>>
  get(path: string): Promise<RecordData | null>
  create(path: string, data: RecordData): void
  set(path: string, data: RecordData): void
  delete?(path:string):void
}
export interface StoreQuery {
  collection: 'gameRequests' | 'comments' | 'shorts' | 'reportSummaries' | 'reports' | 'moderationLogs'
  filter: { field: string; value: string }
  orderBy: string
  limit: number
  cursor?: { time: string; id: string }
}
export interface SearchShortsQuery {fragment:string;gameId?:string;cursor?:{time:string;id:string};limit:number}
export interface PublicPageQuery { kind: 'shorts' | 'comments'; parentId?: string; cursor?: {time:string;id:string;number?:number}; limit: number }
export type GameCatalogFilter = 'all' | 'active' | 'provisional' | 'hidden' | 'banned'
export interface GameCatalogQuery {filter:GameCatalogFilter;cursor?:{time:string;id:string};limit:number}
export interface RankingQuery {mode:'latest'|'oldest'|'likes'|'relevant';gameId?:string;generationId?:string;readTime?:string;cursor?:{id:string;time:string;value?:number};limit:15}
export interface AdminListQuery {kind:'games'|'gameRequests'|'comments'|'shorts'|'reportSummaries';filter:string;sort:AdminSort;cursor?:AdminListCursor;limit:21}
export interface AtomicStore {
  expiredNetworkRecords?: (now:Date)=>Promise<Array<{id:string;data:RecordData}>>
  adminListPage?: (query:AdminListQuery)=>Promise<Array<{id:string;data:RecordData}>>
  scanReportSummaries?: (after?:string)=>Promise<Array<{id:string;data:RecordData}>>
  rankingBootstrapPage?: (collection:'shorts'|'games'|'shortLikes'|'comments'|'commentRequests',after?:string,readTime?:string)=>Promise<{items:Array<{id:string;data:RecordData}>;readTime:string}>
  rankingItemsPage?: (generationId:string)=>Promise<Array<{id:string;data:RecordData}>>
  rankingSourcePage?: (after?:string,readTime?:string)=>Promise<{items:Array<{id:string;data:RecordData}>;readTime:string}>
  snapshotGet?: (path:string,readTime:string)=>Promise<RecordData|null>
  rankingPage?: (query:RankingQuery)=>Promise<{items:Array<{id:string;data:RecordData}>;readTime:string}>
  scanLikeRecords?: (collection:'shortLikes'|'likeAttempts',after?:string)=>Promise<Array<{id:string;data:RecordData}>>
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

