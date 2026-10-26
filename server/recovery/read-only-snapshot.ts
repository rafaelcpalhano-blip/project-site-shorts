/** Local preparation only. No default transport, credentials, files, restore or runtime route. */
export interface SnapshotRead {
  method: 'GET' | 'POST'
  url: string
  body?: {pageSize: number; readTime: string; pageToken?: string}
  signal: AbortSignal
}
export interface SnapshotDocument {
  path: string
  fields: Record<string, unknown>
  createTime: string
  updateTime: string
}
export interface FirestoreSnapshot {
  schemaVersion: 1
  projectId: 'clipzone-db02a' | 'demo-clipzone-tests'
  databaseId: '(default)'
  readTime: string
  collectionPaths: string[]
  missingParentPaths: string[]
  documents: SnapshotDocument[]
  requests: number
  sha256: string
}
type Source = Pick<FirestoreSnapshot, 'projectId' | 'databaseId'>
const fail = (): never => { throw Error('snapshot-invalid-or-incomplete') }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail()
  return value as Record<string, unknown>
}
function canonical(value: unknown, depth = 0): string {
  if (depth > 64) return fail()
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') { if (!Number.isFinite(value)) return fail(); return JSON.stringify(value) }
  if (Array.isArray(value)) return '[' + Array.from(value, item => canonical(item, depth + 1)).join(',') + ']'
  const item = record(value)
  return '{' + Object.keys(item).sort().map(key => JSON.stringify(key) + ':' + canonical(item[key], depth + 1)).join(',') + '}'
}
function controls(value: string) { return [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) }
function segment(value: unknown): string {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || value.includes('/') || controls(value) || new TextEncoder().encode(value).length > 1500) return fail()
  return value
}
function timestamp(value: unknown): bigint {
  if (typeof value !== 'string') return fail()
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(value)
  if (!match) return fail()
  const milliseconds = Date.parse(match[1] + 'Z')
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== match[1] + '.000Z') return fail()
  return BigInt(milliseconds) * 1000000n + BigInt((match[2] ?? '').padEnd(9, '0'))
}
function source(value: Source) {
  if (!value || !['clipzone-db02a', 'demo-clipzone-tests'].includes(value.projectId) || value.databaseId !== '(default)') fail()
}
async function checksum(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
function token(value: unknown): string | undefined {
  if (value === undefined || value === '') return
  if (typeof value !== 'string' || value.length > 8192 || controls(value)) return fail()
  return value
}
function path(value: unknown, document: boolean) {
  if (typeof value !== 'string') return fail()
  const parts = value.split('/');parts.forEach(segment)
  if (parts.length % 2 !== (document ? 0 : 1)) fail()
}
/** Walk all collections at one explicit readTime. Errors never return a completed snapshot.
 * Transport must reject non-2xx HTTP/redirects, bound response bytes and honor signal.
 * Resource enumeration itself is read-only; POST is only :listCollectionIds.
 */
export async function captureFirestoreSnapshot(options: Source & {
  readTime: string
  now: () => number
  limits: {requests: number; documents: number; responseBytes: number}
  read: (request: SnapshotRead) => Promise<unknown>
}): Promise<FirestoreSnapshot> {
  source(options)
  const at = timestamp(options.readTime), {limits} = options
  for (const [name, ceiling] of [['requests', 10000], ['documents', 100000], ['responseBytes', 33554432]] as const) {
    if (!Number.isSafeInteger(limits[name]) || limits[name] < 1 || limits[name] > ceiling) fail()
  }
  const clock = () => {
    const value = options.now()
    if (!Number.isSafeInteger(value) || value < 0) return fail()
    const elapsed = BigInt(value) * 1000000n - at
    if (elapsed < 0n || elapsed >= 3600000000000n) fail()
  }
  clock()
  const root = 'projects/' + options.projectId + '/databases/(default)/documents'
  const endpoint = (suffix: string) => 'https://firestore.googleapis.com/v1/' + root + suffix
  const encode = (value: string) => value.split('/').map(encodeURIComponent).join('/')
  let requests = 0, bytes = 0, seenDocuments = 0
  const call = async (request: Omit<SnapshotRead, 'signal'>) => {
    clock();if (requests >= limits.requests) fail();requests++
    let result: unknown
    try { result = await options.read({...request, signal: AbortSignal.timeout(10000)}) } catch { return fail() }
    clock();bytes += new TextEncoder().encode(canonical(result)).length
    if (bytes > limits.responseBytes) fail()
    return record(result)
  }
  const parents = [''], collections = new Set<string>(), missing = new Set<string>(), documents = new Map<string, SnapshotDocument>()
  for (let index = 0; index < parents.length; index++) {
    const parent = parents[index], collectionTokens = new Set<string>();let next: string | undefined
    do {
      const result = await call({method: 'POST', url: endpoint((parent ? '/' + encode(parent) : '') + ':listCollectionIds'), body: {pageSize: 100, readTime: options.readTime, ...(next ? {pageToken: next} : {})}})
      if (Object.keys(result).some(key => !['collectionIds', 'nextPageToken'].includes(key))) fail()
      const ids = result.collectionIds ?? []
      if (!Array.isArray(ids)) return fail()
      for (const id of ids) {
        const collection = (parent ? parent + '/' : '') + segment(id)
        if (collections.has(collection)) fail();collections.add(collection)
        const pageTokens = new Set<string>();let page: string | undefined
        do {
          const url = new URL(endpoint('/' + encode(collection)))
          url.search = new URLSearchParams({pageSize: '100', showMissing: 'true', readTime: options.readTime, ...(page ? {pageToken: page} : {})}).toString()
          const listed = await call({method: 'GET', url: url.href}), rows = listed.documents ?? []
          if (Object.keys(listed).some(key => !['documents', 'nextPageToken'].includes(key))) fail()
          if (!Array.isArray(rows)) return fail()
          for (const raw of rows) {
            if (++seenDocuments > limits.documents) fail()
            const row = record(raw), prefix = root + '/' + collection + '/'
            if (Object.keys(row).some(key => !['name', 'fields', 'createTime', 'updateTime'].includes(key))) fail()
            if (typeof row.name !== 'string' || !row.name.startsWith(prefix)) fail()
            const id = segment((row.name as string).slice(prefix.length)), documentPath = collection + '/' + id
            if (documents.has(documentPath) || missing.has(documentPath)) fail()
            if (row.createTime === undefined && row.updateTime === undefined && row.fields === undefined) missing.add(documentPath)
            else {
              const created = timestamp(row.createTime), updated = timestamp(row.updateTime)
              if (created > updated || updated > at) fail()
              const fields = record(row.fields === undefined ? {} : row.fields)
              documents.set(documentPath, {path: documentPath, fields: JSON.parse(canonical(fields)), createTime: row.createTime as string, updateTime: row.updateTime as string})
            }
            parents.push(documentPath)
          }
          page = token(listed.nextPageToken)
          if (page) {if (pageTokens.has(page)) fail();pageTokens.add(page)}
        } while (page)
      }
      next = token(result.nextPageToken)
      if (next) {if (collectionTokens.has(next)) fail();collectionTokens.add(next)}
    } while (next)
  }
  clock()
  const snapshot = {schemaVersion: 1 as const, projectId: options.projectId, databaseId: options.databaseId, readTime: options.readTime,
    collectionPaths: [...collections].sort(), missingParentPaths: [...missing].sort(), documents: [...documents.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), requests}
  return {...snapshot, sha256: await checksum(snapshot)}
}
/** Integrity/shape check only. A hash does not prove trusted origin or independent completeness. */
export async function verifyFirestoreSnapshot(value: FirestoreSnapshot, expected: Source): Promise<void> {
  source(expected);source(value)
  if (value.projectId !== expected.projectId || value.databaseId !== expected.databaseId || value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.sha256)) fail()
  timestamp(value.readTime)
  if (!Number.isSafeInteger(value.requests) || value.requests < 1 || value.requests > 10000 || !Array.isArray(value.documents) || !Array.isArray(value.collectionPaths) || !Array.isArray(value.missingParentPaths)) fail()
  const seen = new Set<string>(), collections = new Set(value.collectionPaths)
  if (collections.size !== value.collectionPaths.length) fail()
  for (const item of value.collectionPaths) path(item, false)
  for (const item of [...value.missingParentPaths, ...value.documents.map(row => row.path)]) {
    path(item, true);if (seen.has(item) || !collections.has(item.split('/').slice(0, -1).join('/'))) fail();seen.add(item)
  }
  for (const item of value.collectionPaths) {
    const parent = item.split('/').slice(0, -1).join('/')
    if (parent && !seen.has(parent)) fail()
  }
  for (const row of value.documents) {record(row.fields);if (timestamp(row.createTime) > timestamp(row.updateTime) || timestamp(row.updateTime) > timestamp(value.readTime)) fail()}
  const {sha256, ...contents} = value
  if (await checksum(contents) !== sha256) fail()
}
