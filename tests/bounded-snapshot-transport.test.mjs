import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {createBoundedSnapshotTransport} from '../server/recovery/bounded-snapshot-transport.ts'
import {captureFirestoreSnapshot} from '../server/recovery/read-only-snapshot.ts'
const originalFetch = globalThis.fetch
before(() => { globalThis.fetch = () => assert.fail('Real network forbidden') })
after(() => { globalThis.fetch = originalFetch })
const root = 'https://firestore.googleapis.com/v1/projects/demo-clipzone-tests/databases/(default)/documents'
const time = '2026-10-26T12:00:00Z'
const request = () => ({method: 'POST', url: root + ':listCollectionIds', body: {pageSize: 100, readTime: time}, signal: new AbortController().signal})
const json = value => new Response(JSON.stringify(value), {headers: {'Content-Type': 'application/json; charset=utf-8'}})
function setup(patch = {}) {
 const calls = []; let tokens = 0
 const options = {projectId: 'demo-clipzone-tests', maxResponseBytes: 1000, timeoutMs: 1000, getAccessToken: async () => { tokens++; return 'fixture-token' }, fetch: async (...args) => { calls.push(args); return json({}) }, ...patch}
 return {read: createBoundedSnapshotTransport(options), calls, tokens: () => tokens, options}
}
test('read-only transport integrates with snapshot core and carries token only to fixed official target', async () => {
 const f = setup()
 const snapshot = await captureFirestoreSnapshot({projectId: 'demo-clipzone-tests', databaseId: '(default)', readTime: time, now: () => Date.parse(time), limits: {requests: 5, documents: 5, responseBytes: 1000}, read: f.read})
 assert.equal(snapshot.documents.length, 0); assert.equal(snapshot.requests, 1)
 const [url, init] = f.calls[0]
 assert.equal(url, root + ':listCollectionIds'); assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store')
 assert.equal(init.headers.Authorization, 'Bearer fixture-token'); assert.equal(init.method, 'POST')
 assert.deepEqual(JSON.parse(init.body), {pageSize: 100, readTime: time})
})
test('foreign hosts, projects, mutation methods and invalid request shapes fail before token lookup', async () => {
 const changes = [{url: root.replace('googleapis.com', 'googleapis.com.evil.test') + ':listCollectionIds'}, {url: root.replace('demo-clipzone-tests', 'clipzone-db02a') + ':listCollectionIds'}, {url: root + 'evil:listCollectionIds'}, {method: 'DELETE'}, {url: root + ':commit'}, {url: root + '/games%2Fbad/g:listCollectionIds'}, {url: root + ':listCollectionIds#fragment'}, {body: {pageSize: 100, readTime: time, writes: []}}, {method: 'GET', url: root + '/games?pageSize=100&showMissing=true&readTime=x&readTime=y', body: undefined}]
 for (const change of changes) { const f = setup(); await assert.rejects(f.read({...request(), ...change}), /^Error: snapshot-transport-failed$/); assert.equal(f.tokens(), 0); assert.equal(f.calls.length, 0) }
})
test('GET pagination is supported without request body or mutation endpoints', async () => {
 const f = setup()
 await f.read({...request(), method: 'GET', body: undefined, url: root + '/games?pageSize=100&showMissing=true&readTime=' + encodeURIComponent(time) + '&pageToken=next'})
 assert.equal(f.calls[0][1].body, undefined); assert.equal(f.calls[0][1].method, 'GET')
})
test('non-success, redirects, wrong MIME and error envelopes are sanitized without retries', async () => {
 for (const response of [new Response('secret', {status: 403}), new Response(null, {status: 302, headers: {Location: 'https://evil.test'}}), new Response('{}'), json({error: {message: 'secret'}}), new Response('bad', {headers: {'Content-Type': 'application/json'}})]) {
  let calls = 0; const f = setup({fetch: async () => { calls++; return response }})
  await assert.rejects(f.read(request()), /^Error: snapshot-transport-failed$/); assert.equal(calls, 1)
 }
})
test('response byte limit applies before JSON parse with or without content length and cancels stream', async () => {
 for (const advertised of [false, true]) {
  let cancelled = false
  const response = new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(' '.repeat(50))) }, cancel() { cancelled = true }}), {headers: {'Content-Type': 'application/json', ...(advertised ? {'Content-Length': '50'} : {})}})
  const f = setup({maxResponseBytes: 20, fetch: async () => response})
  await assert.rejects(f.read(request()), /snapshot-transport-failed/); assert.equal(cancelled, true)
 }
})
test('invalid UTF8, malformed JSON and scalar JSON cannot become snapshots', async () => {
 for (const body of [new Uint8Array([255]), '{', 'null', '[]', 'false']) {
  const f = setup({fetch: async () => new Response(body, {headers: {'Content-Type': 'application/json'}})})
  await assert.rejects(f.read(request()), /snapshot-transport-failed/)
 }
})
test('caller abort and timeout stop token, fetch and stream waits without retry or sensitive errors', async () => {
 for (const phase of ['token', 'fetch', 'stream']) {
  const controller = new AbortController(); let cancelled = false
  const f = setup({getAccessToken: phase === 'token' ? () => new Promise(() => {}) : async () => 'fixture-token', fetch: phase === 'fetch' ? () => new Promise(() => {}) : async () => new Response(new ReadableStream({cancel() { cancelled = true }}), {headers: {'Content-Type': 'application/json'}})})
  const pending = f.read({...request(), signal: controller.signal})
  await new Promise(resolve => setTimeout(resolve, 10)); controller.abort(Error('private input'))
  await assert.rejects(pending, /^Error: snapshot-transport-failed$/)
  if (phase === 'stream') assert.equal(cancelled, true)
 }
 const f = setup({timeoutMs: 5, fetch: async () => new Promise(() => {})})
 const keepAlive = setTimeout(() => {}, 1000)
 try { await assert.rejects(f.read(request()), /snapshot-transport-failed/) } finally { clearTimeout(keepAlive) }
})
test('invalid settings and unsafe tokens fail closed without network', async () => {
 for (const patch of [{projectId: 'wrong'}, {maxResponseBytes: 0}, {timeoutMs: 30001}, {fetch: undefined}]) assert.throws(() => setup(patch), /snapshot-transport-failed/)
 for (const token of ['', 'token\r\ninjected', null]) { const f = setup({getAccessToken: async () => token}); await assert.rejects(f.read(request()), /snapshot-transport-failed/); assert.equal(f.calls.length, 0) }
 const f = setup({getAccessToken: async () => { throw Error('private-token') }})
 await assert.rejects(f.read(request()), /^Error: snapshot-transport-failed$/)
})
