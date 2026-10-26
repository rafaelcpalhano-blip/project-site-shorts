// Bounded, isolate-local cache of non-extractable cryptographic keys only.
// Never cache a request, transport, identity result, authorization or quota decision.
const maximumKeys = 8
const keys = new Map<string, Promise<CryptoKey>>()
export function importHmacKey(secret: string, usage: 'sign' | 'sign-verify'): Promise<CryptoKey> {
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error('invalid-hmac-key')
  const id = usage + ':' + secret.toLowerCase()
  const existing = keys.get(id)
  if (existing) return existing
  if (keys.size >= maximumKeys) keys.delete(keys.keys().next().value!)
  const pending = crypto.subtle.importKey('raw', Uint8Array.from(secret.match(/../g)!, part => Number.parseInt(part, 16)),
    { name: 'HMAC', hash: 'SHA-256' }, false, usage === 'sign' ? ['sign'] : ['sign', 'verify'])
  keys.set(id, pending)
  void pending.catch(() => { if (keys.get(id) === pending) keys.delete(id) })
  return pending
}
