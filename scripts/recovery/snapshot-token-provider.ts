import {createServiceTokenProvider} from '../../server/auth/service-token.ts'

/** Local backup composition only. Existing identity/scope, injected signer and
 * HTTP exchange, explicit operation lifetime. No key loading, default fetch,
 * environment discovery, IAM change or remote action on construction.
 */
export function createSnapshotTokenProvider(options: {
  sign: (content: Uint8Array) => Promise<Uint8Array>
  exchange: typeof globalThis.fetch
  now: () => Date
  signal: AbortSignal
}): (requestSignal: AbortSignal) => Promise<string> {
  const failed = () => new Error('snapshot-auth-unavailable')
  if (typeof options.exchange !== 'function' || typeof options.sign !== 'function' ||
      typeof options.now !== 'function' || !(options.signal instanceof AbortSignal)) throw failed()
  const {signal, exchange, sign, now} = options
  let token: () => Promise<string>
  try {
    const provider = createServiceTokenProvider({projectId: 'clipzone-db02a',
      clientEmail: 'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',
      sign: async content => {
        signal.throwIfAborted()
        const signature = await sign(content)
        signal.throwIfAborted()
        return signature
      }, now})
    token = provider(async (input, init) => {
      signal.throwIfAborted()
      if (input !== 'https://oauth2.googleapis.com/token' || init?.method !== 'POST' ||
          init.redirect !== 'error' || !(init.signal instanceof AbortSignal)) throw failed()
      return exchange(input, {...init, signal: AbortSignal.any([signal, init.signal])})
    })
  } catch { throw failed() }
  return async requestSignal => {
    let abort: () => void = () => {}
    let combined: AbortSignal | undefined
    try {
      if (!(requestSignal instanceof AbortSignal)) throw failed()
      combined = AbortSignal.any([signal, requestSignal])
      combined.throwIfAborted()
      const stopped = new Promise<never>((_, reject) => {
        abort = () => reject(failed())
        combined!.addEventListener('abort', abort, {once: true})
      })
      const value = await Promise.race([token(), stopped])
      combined.throwIfAborted()
      return value
    } catch { throw failed() }
    finally { combined?.removeEventListener('abort', abort) }
  }
}
