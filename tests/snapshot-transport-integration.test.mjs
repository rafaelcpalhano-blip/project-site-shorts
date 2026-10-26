import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {captureFirestoreSnapshot, verifyFirestoreSnapshot} from '../server/recovery/read-only-snapshot.ts'
import {createBoundedSnapshotTransport} from '../server/recovery/bounded-snapshot-transport.ts'
const realFetch = globalThis.fetch
before(() => { globalThis.fetch = () => assert.fail('Real network forbidden in recovery integration') })
after(() => { globalThis.fetch = realFetch })
const projectId = 'demo-clipzone-tests', databaseId = '(default)', at = '2026-10-26T12:00:00Z'
const root = 'projects/' + projectId + '/databases/(default)/documents'
const row = {name: root + '/games/game1', fields: {name: {stringValue: 'Jogo fictício'}, count: {integerValue: '9223372036854775807'}}, createTime: '2026-10-26T11:00:00Z', updateTime: '2026-10-26T11:59:59.123456789Z'}
function setup(mode) {
 const calls = []; let tokenCalls = 0
 const read = createBoundedSnapshotTransport({projectId, timeoutMs: 1000, maxResponseBytes: 4000,
  getAccessToken: async () => { tokenCalls++; return 'fixture-only' },
  fetch: async (input, init) => {
   const url = new URL(input); calls.push({url, method: init.method})
   assert.equal(url.origin, 'https://firestore.googleapis.com'); assert.equal(init.redirect, 'error')
   assert.equal(init.headers.Authorization, 'Bearer fixture-only')
   if (mode === 'rate-limited' && calls.length === 2) return Response.json({error: {message: 'private upstream details'}}, {status: 429})
   if (mode === 'oversized' && calls.length === 2) return new Response(' '.repeat(4001), {headers: {'Content-Type': 'application/json'}})
   if (init.method === 'POST') {
    assert.equal(JSON.parse(init.body).readTime, at)
    return Response.json(url.pathname.endsWith('/documents:listCollectionIds') ? {collectionIds: ['games']} : {})
   }
   assert.equal(url.searchParams.get('readTime'), at); assert.equal(url.searchParams.get('showMissing'), 'true')
   return Response.json({documents: [row]})
  },
 })
 const capture = () => captureFirestoreSnapshot({projectId, databaseId, readTime: at, now: () => Date.parse(at) + 1000, limits: {requests: 10, documents: 10, responseBytes: 10000}, read})
 return {capture, calls, tokenCalls: () => tokenCalls}
}
test('snapshot and bounded transport compose without losing typed fields, metadata or integrity', async () => {
 const f = setup(); const snapshot = await f.capture()
 await verifyFirestoreSnapshot(snapshot, {projectId, databaseId})
 assert.equal(snapshot.documents.length, 1); assert.equal(snapshot.requests, 3); assert.equal(f.tokenCalls(), 3)
 assert.equal(snapshot.documents[0].path, 'games/game1')
 assert.deepEqual(snapshot.documents[0].fields, row.fields); assert.equal(snapshot.documents[0].updateTime, row.updateTime)
 assert.deepEqual(f.calls.map(call => call.method), ['POST', 'GET', 'POST'])
 assert.ok(f.calls.every(call => call.url.pathname.startsWith('/v1/' + root)))
})
test('provider refusal stops combined traversal without retries, partial snapshot or private error', async () => {
 const f = setup('rate-limited'); let completed
 await assert.rejects(async () => { completed = await f.capture() }, /^Error: snapshot-invalid-or-incomplete$/)
 assert.equal(completed, undefined); assert.equal(f.calls.length, 2); assert.equal(f.tokenCalls(), 2)
})
test('stream budget in transport stops combined traversal before oversized JSON becomes a snapshot', async () => {
 const f = setup('oversized'); let completed
 await assert.rejects(async () => { completed = await f.capture() }, /^Error: snapshot-invalid-or-incomplete$/)
 assert.equal(completed, undefined); assert.equal(f.calls.length, 2)
})
