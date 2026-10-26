import {captureFirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'
import {createBoundedSnapshotTransport} from '../../server/recovery/bounded-snapshot-transport.ts'
import {createSnapshotTokenProvider} from './snapshot-token-provider.ts'
import {checkPrivateSnapshotDestination, writePrivateSnapshot} from './private-snapshot-writer.ts'

/** Opt-in library: no CLI, key loading or default network. Injecting real sign/HTTP
 * would perform remote reads, requiring separately approved operational inputs.
 */
export async function capturePrivateBackup(input: {
  projectId: 'clipzone-db02a'; databaseId: '(default)'
  directory: string; repositoryRoot: string; basename: string
  readTime: string; now: () => Date
  limits: {requests: number; documents: number; responseBytes: number}
  maxFileBytes: number; timeoutMs: number; signal: AbortSignal
  verifyPrivateDirectory: (canonicalDirectory: string) => Promise<boolean>
  sign: (content: Uint8Array) => Promise<Uint8Array>
  oauthExchange: typeof globalThis.fetch; firestoreRead: typeof globalThis.fetch
}) {
  const stopped = new AbortController()
  try {
    // Capture configuration before the first await; do not retain mutable input.
    const options = {...input, limits: {...input.limits}}
    if (options.projectId !== 'clipzone-db02a' || options.databaseId !== '(default)' ||
        !(options.signal instanceof AbortSignal) || typeof options.now !== 'function' ||
        typeof options.sign !== 'function' || typeof options.oauthExchange !== 'function' ||
        typeof options.firestoreRead !== 'function' ||
        !Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 120000 ||
        !Number.isSafeInteger(options.maxFileBytes) || options.maxFileBytes < 1 || options.maxFileBytes > 8388608) throw Error()
    for (const [key, ceiling] of [['requests', 250], ['documents', 500], ['responseBytes', 5242880]] as const) {
      if (!Number.isSafeInteger(options.limits[key]) || options.limits[key] < 1 || options.limits[key] > ceiling) throw Error()
    }
    const signal = AbortSignal.any([options.signal, stopped.signal, AbortSignal.timeout(options.timeoutMs)])
    signal.throwIfAborted()
    await checkPrivateSnapshotDestination(options)
    signal.throwIfAborted()
    const getAccessToken = createSnapshotTokenProvider({sign: options.sign, exchange: options.oauthExchange,
      now: options.now, signal})
    const transport = createBoundedSnapshotTransport({projectId: options.projectId, getAccessToken,
      fetch: options.firestoreRead, maxResponseBytes: Math.min(1048576, options.limits.responseBytes), timeoutMs: 10000})
    const snapshot = await captureFirestoreSnapshot({projectId: options.projectId, databaseId: options.databaseId,
      readTime: options.readTime, now: () => options.now().getTime(), limits: options.limits,
      read: request => {
        signal.throwIfAborted()
        return transport({...request, signal: AbortSignal.any([signal, request.signal])})
      }})
    signal.throwIfAborted()
    const result = await writePrivateSnapshot({...options, snapshot,
      verifyPrivateDirectory: async directory => {
        signal.throwIfAborted()
        const allowed = await options.verifyPrivateDirectory(directory)
        signal.throwIfAborted()
        return allowed
      }, maxBytes: options.maxFileBytes})
    signal.throwIfAborted()
    return {...result, requests: snapshot.requests, readTime: snapshot.readTime}
  } catch {
    // No private payload/error disclosure, retry, deletion or remote writes.
    throw Error('private-backup-not-verified')
  } finally {
    // Closes the OAuth operation lifetime even on local file/verification failure.
    stopped.abort()
  }
}
