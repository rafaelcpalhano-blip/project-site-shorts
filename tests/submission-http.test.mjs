import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSubmission } from '../server/http/submissions.ts'
import { SubmissionError } from '../server/submissions/submit-short.ts'
const origin = 'https://clipzone.example'
const input = { url: 'https://www.youtube.com/shorts/abcdefghijk', gameId: 'game' }
function request(body = JSON.stringify(input), headers = {}, method = 'POST') {
  return new Request(origin + '/api/shorts', { method,
    headers: { origin, 'content-type': 'application/json', ...headers },
    ...(method === 'POST' ? { body } : {}),
  })
}
function dependencies(patch = {}) {
  return { origin, resolveVisitor: async () => 'a'.repeat(64), checkAbuse: async () => {},
    now: () => new Date('2026-10-19T12:00:00Z'),
    verify: async () => ({ existence: 'confirmed', shortFormat: 'confirmed', gameMatch: 'confirmed', moderation: 'clear', flags: [] }),
    store: { transact: async work => work({ get: async path => path === 'games/game' ? { status: 'active', officialName: 'Game' } : null,
      create() {}, set() {},
    }) }, ...patch,
  }
}
test('HTTP exige configuração, POST, origem e JSON antes de chamar serviços', async () => {
  const deps = dependencies({ resolveVisitor: async () => { throw new Error('must not run') } })
  assert.equal((await handleSubmission(request())).status, 503)
  assert.equal((await handleSubmission(request(undefined, {}, 'GET'), deps)).status, 405)
  for (const headers of [{ origin: 'https://evil.example' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await handleSubmission(request(undefined, headers), deps)).status, 403)
  }
  assert.equal((await handleSubmission(request(undefined, { 'content-type': 'text/plain' }), deps)).status, 415)
  assert.equal((await handleSubmission(request(undefined, { 'content-encoding': 'gzip' }), deps)).status, 415)
})
test('HTTP rejeita sessão inválida, JSON inválido, campos privilegiados e corpo excessivo', async () => {
  assert.equal((await handleSubmission(request(), dependencies({ resolveVisitor: async () => null }))).status, 401)
  for (const body of ['{', JSON.stringify({ ...input, visitorHash: 'b'.repeat(64) }), JSON.stringify({ ...input, moderationStatus: 'published' })]) {
    assert.equal((await handleSubmission(request(body), dependencies())).status, 400)
  }
  // No Content-Length: the streamed byte limit must still apply.
  assert.equal((await handleSubmission(request('x'.repeat(8193)), dependencies())).status, 413)
  assert.equal((await handleSubmission(request(undefined, { 'content-length': '8193' }), dependencies())).status, 413)
})
test('HTTP distingue publicado de pendente e não permite cache', async () => {
  const published = await handleSubmission(request(), dependencies())
  assert.equal(published.status, 201)
  assert.equal((await published.json()).status, 'published')
  assert.equal(published.headers.get('cache-control'), 'no-store')
  const pending = await handleSubmission(request(), dependencies({ verify: async () => { throw new Error('provider down') } }))
  assert.equal(pending.status, 202)
  assert.equal((await pending.json()).status, 'pending')
})
test('HTTP apresenta limites e duplicatas públicas sem revelar falhas internas', async () => {
  for (const [code, expected] of [['daily-limit', 429], ['abuse-limit', 429], ['duplicate-video', 409]]) {
    const result = await handleSubmission(request(), dependencies({ checkAbuse: async () => { throw new SubmissionError(code) } }))
    assert.equal(result.status, expected)
    assert.equal((await result.json()).publicShortId, undefined)
  }
  const result = await handleSubmission(request(), dependencies({ resolveVisitor: async () => { throw new Error('secret-token') } }))
  assert.equal(result.status, 503)
  assert.ok(!(await result.text()).includes('secret-token'))
})
