import {importHmacKey} from './hmac-key.ts'
const cookieName = '__Host-clipzone-visitor'
const lifetime = 30 * 24 * 60 * 60
const encoder = new TextEncoder()
function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes instanceof Uint8Array ? bytes : bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
function unhex(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(value.match(/../g)!, byte => Number.parseInt(byte, 16))
}
export interface VisitorIdentity {
  resolveVisitor(request: Request): Promise<string | null>
  issue(): Promise<string>
}
// Secret must be generated randomly and stored only in the server secret store.
export async function createVisitorIdentity(secret: string, now: () => Date = () => new Date()): Promise<VisitorIdentity> {
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error('Invalid visitor signing secret')
  const key = await importHmacKey(secret, 'sign-verify')
  const seconds = () => {
    const value = Math.floor(now().getTime() / 1000)
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid server clock')
    return value
  }
  return {
    async issue() {
      const id = hex(crypto.getRandomValues(new Uint8Array(32)))
      const payload = 'v1.' + id + '.' + seconds()
      const signature = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)))
      return cookieName + '=' + payload + '.' + signature + '; Path=/; Max-Age=' + lifetime + '; HttpOnly; Secure; SameSite=Strict'
    },
    async resolveVisitor(request) {
      const raw = request.headers.get('cookie') || ''
      if (raw.length > 8192) return null
      const matches = raw.split(';').map(part => part.trim()).filter(part => part.startsWith(cookieName + '='))
      if (matches.length !== 1) return null
      const token = matches[0].slice(cookieName.length + 1)
      const match = /^v1\.([a-f0-9]{64})\.(\d{1,12})\.([a-f0-9]{64})$/.exec(token)
      if (!match) return null
      const issued = Number(match[2])
      const current = seconds()
      if (issued > current || current - issued >= lifetime) return null
      const payload = token.slice(0, token.lastIndexOf('.'))
      if (!await crypto.subtle.verify('HMAC', key, unhex(match[3]), encoder.encode(payload))) return null
      // A separate domain prevents reusing a cookie signature as a public identifier.
      return hex(await crypto.subtle.sign('HMAC', key, encoder.encode('visitor-hash:' + match[1])))
    },
  }
}
