import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {createSnapshotTokenProvider} from '../scripts/recovery/snapshot-token-provider.ts'
import {createBoundedSnapshotTransport} from '../server/recovery/bounded-snapshot-transport.ts'
const realFetch = globalThis.fetch
before(() => { globalThis.fetch = () => assert.fail('real network forbidden') })
after(() => { globalThis.fetch = realFetch })
const at = new Date('2026-10-26T12:00:00Z')
function setup(exchange) {
  const lifetime = new AbortController(); let signs = 0
  const supplier = createSnapshotTokenProvider({signal: lifetime.signal, now: () => at,
    sign: async bytes => {
      signs++
      const [header, payload] = new TextDecoder().decode(bytes).split('.').map(part => JSON.parse(Buffer.from(part, 'base64url')))
      assert.equal(header.alg, 'RS256')
      assert.equal(payload.iss, 'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com')
      assert.equal(payload.scope, 'https://www.googleapis.com/auth/datastore')
      assert.equal(payload.aud, 'https://oauth2.googleapis.com/token')
      return new Uint8Array(256)
    }, exchange})
  return {supplier, lifetime, signs: () => signs}
}
const response = () => Response.json({access_token: 'fixture.token', token_type: 'Bearer', expires_in: 3600})
test('backup token composition pins existing identity and scope, exchanges only with injected HTTP, reuses cache', async () => {
  let calls = 0
  const f = setup(async (input, init) => {
    calls++; assert.equal(input, 'https://oauth2.googleapis.com/token')
    assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error')
    assert.ok(init.signal instanceof AbortSignal)
    assert.equal(new URLSearchParams(init.body).get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer')
    return response()
  })
  assert.equal(calls, 0); assert.equal(f.signs(), 0)
  assert.equal(await f.supplier(new AbortController().signal), 'fixture.token')
  assert.equal(await f.supplier(new AbortController().signal), 'fixture.token')
  assert.equal(calls, 1); assert.equal(f.signs(), 1)
})
test('aborted operation or request cannot sign, exchange or return cached token', async () => {
  let calls = 0; const f = setup(async () => {calls++; return response()})
  const request = new AbortController(); request.abort()
  await assert.rejects(() => f.supplier(request.signal), /^Error: snapshot-auth-unavailable$/)
  assert.equal(f.signs(), 0); assert.equal(calls, 0)
  await f.supplier(new AbortController().signal)
  f.lifetime.abort()
  await assert.rejects(() => f.supplier(new AbortController().signal), /^Error: snapshot-auth-unavailable$/)
  assert.equal(calls, 1)
})
test('operation abort reaches ongoing OAuth exchange; no automatic retry or upstream error disclosure', async () => {
  let calls = 0
  const f = setup(async (_input, init) => {
    calls++; f.lifetime.abort()
    assert.equal(init.signal.aborted, true)
    throw Error('private upstream details')
  })
  await assert.rejects(() => f.supplier(new AbortController().signal), /^Error: snapshot-auth-unavailable$/)
  assert.equal(calls, 1)
})
test('refused exchange is sanitized and does not authorize a Firestore request', async () => {
  let documents = 0
  const f = setup(async () => new Response('private details', {status: 403}))
  const read = createBoundedSnapshotTransport({projectId: 'clipzone-db02a', maxResponseBytes: 10000,
    timeoutMs: 1000, getAccessToken: f.supplier,
    fetch: async () => { documents++; assert.fail('no Firestore access expected') }})
  await assert.rejects(() => read({method: 'POST',
    url: 'https://firestore.googleapis.com/v1/projects/clipzone-db02a/databases/(default)/documents:listCollectionIds',
    body: {pageSize: 100, readTime: at.toISOString()}, signal: new AbortController().signal}),
    /^Error: snapshot-transport-failed$/)
  assert.equal(documents, 0)
})
test('token supplier composes with bounded read transport, rejecting foreign routes before OAuth', async () => {
  let oauth = 0, firestore = 0
  const f = setup(async () => {oauth++; return response()})
  const read = createBoundedSnapshotTransport({projectId: 'clipzone-db02a', maxResponseBytes: 10000,
    timeoutMs: 1000, getAccessToken: f.supplier,
    fetch: async (input, init) => {
      firestore++; assert.equal(new URL(input).hostname, 'firestore.googleapis.com')
      assert.equal(init.headers.Authorization, 'Bearer fixture.token'); return Response.json({collectionIds: []})
    }})
  const req = {method: 'POST', url: 'https://evil.invalid/', body: {pageSize: 100, readTime: at.toISOString()}, signal: new AbortController().signal}
  await assert.rejects(() => read(req), /^Error: snapshot-transport-failed$/)
  assert.equal(oauth, 0)
  req.url = 'https://firestore.googleapis.com/v1/projects/clipzone-db02a/databases/(default)/documents:listCollectionIds'
  assert.deepEqual(await read(req), {collectionIds: []})
  assert.equal(oauth, 1); assert.equal(firestore, 1)
})
