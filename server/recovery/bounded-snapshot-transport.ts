import type {SnapshotRead} from './read-only-snapshot.ts'

/** Local tooling only. No default fetch, token source, credential access or retry. */
export function createBoundedSnapshotTransport(options: {
  projectId: 'clipzone-db02a' | 'demo-clipzone-tests'
  maxResponseBytes: number
  timeoutMs: number
  getAccessToken: (signal: AbortSignal) => Promise<string>
  fetch: typeof globalThis.fetch
}): (request: SnapshotRead) => Promise<unknown> {
  const fail = (): never => { throw Error('snapshot-transport-failed') }
  const controls = (value: string) => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  if (!['clipzone-db02a', 'demo-clipzone-tests'].includes(options.projectId)
    || !Number.isSafeInteger(options.maxResponseBytes) || options.maxResponseBytes < 1 || options.maxResponseBytes > 33554432
    || !Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 30000
    || typeof options.fetch !== 'function' || typeof options.getAccessToken !== 'function') fail()
  const root = '/v1/projects/' + options.projectId + '/databases/(default)/documents'
  async function bounded<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    signal.throwIfAborted()
    let abort: () => void = () => {}
    const stopped = new Promise<never>((_, reject) => {
      abort = () => reject(Error('snapshot-transport-failed'))
      signal.addEventListener('abort', abort, {once: true})
    })
    try { return await Promise.race([promise, stopped]) }
    finally { signal.removeEventListener('abort', abort) }
  }
  return async request => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const url = new URL(request.url)
      if (url.origin !== 'https://firestore.googleapis.com' || url.username || url.password || url.hash
        || !url.pathname.startsWith(root) || ![root, root + '/', root + ':'].some(prefix => url.pathname.startsWith(prefix))) return fail()
      const post = request.method === 'POST'
      if (!post && request.method !== 'GET') return fail()
      const suffix = url.pathname.slice(root.length)
      if (post ? !suffix.endsWith(':listCollectionIds') : suffix.includes(':')) return fail()
      const path = (post ? suffix.slice(0, -':listCollectionIds'.length) : suffix).replace(/^\//, '')
      const segments = path ? path.split('/').map(decodeURIComponent) : []
      if (segments.some(value => !value || value === '.' || value === '..' || value.includes('/') || controls(value))
        || (post ? segments.length % 2 !== 0 : segments.length % 2 !== 1)) return fail()
      if (post) {
        if (url.search || !request.body || Object.keys(request.body).some(key => !['pageSize', 'readTime', 'pageToken'].includes(key))
          || request.body.pageSize !== 100 || typeof request.body.readTime !== 'string'
          || (request.body.pageToken !== undefined && typeof request.body.pageToken !== 'string')) return fail()
      } else {
        if (request.body !== undefined || [...url.searchParams.keys()].some(key => !['pageSize', 'showMissing', 'readTime', 'pageToken'].includes(key))
          || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)
          || url.searchParams.get('pageSize') !== '100' || url.searchParams.get('showMissing') !== 'true'
          || !url.searchParams.get('readTime')) return fail()
      }
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(options.timeoutMs)])
      signal.throwIfAborted()
      // Injected providers must honor cancellation. No credential discovery is provided.
      const token = await bounded(options.getAccessToken(signal), signal)
      signal.throwIfAborted()
      if (typeof token !== 'string' || !token || /\s/.test(token) || controls(token)) return fail()
      const response = await bounded(options.fetch(url.href, {
        method: request.method, signal, redirect: 'error', cache: 'no-store',
        headers: {Authorization: 'Bearer ' + token, Accept: 'application/json', ...(post ? {'Content-Type': 'application/json'} : {})},
        ...(post ? {body: JSON.stringify(request.body)} : {}),
      }), signal)
      if (!response.ok || response.redirected || !response.body
        || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
        void response.body?.cancel().catch(() => {}); return fail()
      }
      const length = response.headers.get('content-length')
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > options.maxResponseBytes)) {
        void response.body.cancel().catch(() => {}); return fail()
      }
      reader = response.body.getReader()
      const chunks: Uint8Array[] = []; let size = 0
      while (true) {
        signal.throwIfAborted()
        const part = await bounded(reader.read(), signal)
        signal.throwIfAborted()
        if (part.done) break
        size += part.value.byteLength
        if (size > options.maxResponseBytes) return fail()
        chunks.push(part.value)
      }
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes))
      if (!value || typeof value !== 'object' || Array.isArray(value) || 'error' in value) return fail()
      return value
    } catch { return fail() }
    finally { if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock() } }
  }
}
