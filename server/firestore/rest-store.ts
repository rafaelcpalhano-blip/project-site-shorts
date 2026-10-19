import type { AtomicStore, AtomicTransaction, RecordData } from './atomic-store.ts'
type Value = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; timestampValue?: string; arrayValue?: { values: Value[] }; mapValue?: { fields: Record<string, Value> } }
function encode(value: unknown): Value {
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  if (value && typeof value === 'object') return { mapValue: { fields: fields(value as RecordData) } }
  throw new Error('Valor Firestore inválido')
}
function fields(data: RecordData): Record<string, Value> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]))
}
function decode(value: Value): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(value.timestampValue!)
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decode)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([key, item]) => [key, decode(item)]))
  return null
}
class FirestoreError extends Error {
  readonly code: string
  constructor(code: string) { super('Firestore: ' + code); this.code = code }
}
interface Options {
  projectId: string
  emulatorPort?: 8080 | 8081
  accessToken?: () => Promise<string>
}
export function createRestStore(options: Options): AtomicStore {
  if (!/^[a-z][a-z0-9-]{2,99}$/.test(options.projectId)) throw new Error('Projeto inválido')
  if (options.emulatorPort && !options.projectId.startsWith('demo-')) throw new Error('Emulador exige projeto demo')
  if (!options.emulatorPort && !options.accessToken) throw new Error('Credencial de servidor não configurada')
  const origin = options.emulatorPort ? 'http://127.0.0.1:' + options.emulatorPort : 'https://firestore.googleapis.com'
  const root = 'projects/' + options.projectId + '/databases/(default)/documents'
  const name = (path: string) => {
    if (!/^[\w-]+\/[\w-]+$/.test(path)) throw new Error('Caminho de documento inválido')
    return root + '/' + path
  }
  const request = async (operation: string, body: unknown) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    headers.Authorization = options.emulatorPort ? 'Bearer owner' : 'Bearer ' + await options.accessToken!()
    const response = await fetch(origin + '/v1/' + root + ':' + operation, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    })
    const result = await response.json()
    if (!response.ok) throw new FirestoreError(result.error?.status || 'UNAVAILABLE')
    return result
  }
  return {
    async transact<T>(work: (transaction: AtomicTransaction) => Promise<T>): Promise<T> {
      let previous: string | undefined
      for (let attempt = 0; attempt < 8; attempt++) {
        const { transaction } = await request('beginTransaction', { options: { readWrite: previous ? { retryTransaction: previous } : {} } })
        const writes: unknown[] = []
        const port: AtomicTransaction = {
          async get(path) {
            if (writes.length) throw new Error('Todas as leituras devem preceder as gravações')
            const result = await request('batchGet', { documents: [name(path)], transaction })
            const found = (Array.isArray(result) ? result : [result]).find(item => item.found)?.found
            return found ? Object.fromEntries(Object.entries(found.fields || {}).map(([key, value]) => [key, decode(value as Value)])) : null
          },
          create(path, data) { writes.push({ update: { name: name(path), fields: fields(data) }, currentDocument: { exists: false } }) },
          set(path, data) { writes.push({ update: { name: name(path), fields: fields(data) } }) },
        }
        try {
          const result = await work(port)
          await request('commit', { writes, transaction })
          return result
        } catch (error) {
          if (!(error instanceof FirestoreError) || error.code !== 'ABORTED' || attempt === 7) {
            try { await request('rollback', { transaction }) } catch { /* Preserve original failure. */ }
            throw error
          }
          previous = transaction
          await new Promise(resolve => setTimeout(resolve, Math.random() * Math.min(1500, 100 * 2 ** attempt)))
        }
      }
      throw new Error('Transação não concluída')
    },
  }
}

