import test from 'node:test'
import assert from 'node:assert/strict'
import { createVisitorIdentity } from '../server/security/visitor-identity.ts'
import { handleSession } from '../server/http/session.ts'
const origin = 'https://clipzone.example'
const secret = 'a1'.repeat(32)
const date = new Date('2026-10-19T12:00:00Z')
function request(cookie = '', extra = {}) {
  return new Request(origin + '/api/session', { method: 'POST', headers: { origin, cookie, ...extra } })
}
const cookieOnly = cookie => cookie.split(';')[0]
test('identidade assinada é estável, privada e possui atributos de cookie seguros', async () => {
  const identity = await createVisitorIdentity(secret, () => date)
  const cookie = await identity.issue()
  for (const flag of ['__Host-', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag))
  assert.ok(!cookie.includes('Domain='))
  const first = await identity.resolveVisitor(request(cookieOnly(cookie)))
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(await identity.resolveVisitor(request(cookieOnly(cookie))), first)
  assert.ok(!cookie.includes(first))
  assert.notEqual(await identity.resolveVisitor(request(cookieOnly(await identity.issue()))), first)
})
test('assinatura, emissor, cookies duplicados e valores malformados são rejeitados', async () => {
  const identity = await createVisitorIdentity(secret, () => date)
  const cookie = cookieOnly(await identity.issue())
  for (const value of ['', cookie + '; ' + cookie, cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0'), '__Host-clipzone-visitor=invalid', 'x'.repeat(8193)]) {
    assert.equal(await identity.resolveVisitor(request(value)), null)
  }
  const other = await createVisitorIdentity('b2'.repeat(32), () => date)
  assert.equal(await other.resolveVisitor(request(cookie)), null)
  await assert.rejects(() => createVisitorIdentity('short'))
})
test('identidades futuras e expiradas não são aceitas', async () => {
  const identity = await createVisitorIdentity(secret, () => date)
  const cookie = cookieOnly(await identity.issue())
  for (const shift of [-1000, 30 * 86400 * 1000]) {
    const reader = await createVisitorIdentity(secret, () => new Date(date.getTime() + shift))
    assert.equal(await reader.resolveVisitor(request(cookie)), null)
  }
})
test('sessão exige configuração, origem confiável, HTTPS e controle de emissão', async () => {
  const identity = await createVisitorIdentity(secret, () => date)
  const deps = { origin, identity, allowIssuance: async () => false }
  assert.equal((await handleSession(request())).status, 503)
  assert.equal((await handleSession(new Request(origin), deps)).status, 405)
  assert.equal((await handleSession(request('', { origin: 'https://evil.example' }), deps)).status, 403)
  assert.equal((await handleSession(request(), deps)).status, 429)
  assert.equal((await handleSession(request(), { ...deps, allowIssuance: async () => { throw new Error('private detail') } })).status, 503)
  const local = 'http://localhost:5173'
  assert.equal((await handleSession(new Request(local, { method: 'POST', headers: { origin: local } }), { ...deps, origin: local })).status, 503)
})
test('sessão emite cookie após admissão e preserva identidade existente', async () => {
  const identity = await createVisitorIdentity(secret, () => date)
  let calls = 0
  const deps = { origin, identity, allowIssuance: async () => { calls++; return true } }
  const first = await handleSession(request(), deps)
  assert.equal(first.status, 204)
  assert.equal(first.headers.get('cache-control'), 'no-store')
  assert.equal(await first.text(), '')
  const cookie = first.headers.get('set-cookie')
  assert.ok(cookie)
  const second = await handleSession(request(cookieOnly(cookie)), deps)
  assert.equal(second.status, 204)
  assert.equal(second.headers.get('set-cookie'), null)
  assert.equal(calls, 1)
})
