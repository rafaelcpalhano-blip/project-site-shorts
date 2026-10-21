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
export interface AtomicStore {
  query?: (query: StoreQuery) => Promise<Array<{ id: string; data: RecordData }>>
  transact<T>(work: (transaction: AtomicTransaction) => Promise<T>): Promise<T>
}

