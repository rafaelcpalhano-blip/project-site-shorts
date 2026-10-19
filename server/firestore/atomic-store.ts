export type RecordData = Record<string, unknown>
export interface AtomicTransaction {
  get(path: string): Promise<RecordData | null>
  create(path: string, data: RecordData): void
  set(path: string, data: RecordData): void
}
export interface AtomicStore {
  transact<T>(work: (transaction: AtomicTransaction) => Promise<T>): Promise<T>
}

