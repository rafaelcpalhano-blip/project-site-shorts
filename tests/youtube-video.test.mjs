import test from 'node:test'
import assert from 'node:assert/strict'
import { createYouTubeVerifier } from '../server/videos/youtube.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const input = { url: 'https://www.youtube.com/shorts/abcdefghijk' }
const item = { id: 'abcdefghijk', snippet: { title: 'Jogada' }, status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: true } }
function verify(result, fetcher) {
  return createYouTubeVerifier({ apiKey: 'test-only-key', fetcher: fetcher ?? (async () => Response.json(result)) })
}
test('YouTube usa destino fixo e parâmetros oficiais, sem inferir Shorts ou moderação', async () => {
  let endpoint
  const result = await verify(null, async (url, options) => {
    endpoint = url
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal)
    return Response.json({ items: [item] })
  })(input)
  assert.equal(endpoint.origin + endpoint.pathname, 'https://www.googleapis.com/youtube/v3/videos')
  assert.equal(endpoint.searchParams.get('id'), 'abcdefghijk')
  assert.equal(endpoint.searchParams.get('key'), 'test-only-key')
  assert.equal(result.existence, 'confirmed')
  assert.equal(result.title, 'Jogada')
  assert.equal(result.shortFormat, 'unknown')
  assert.equal(result.gameMatch, 'unknown')
  assert.equal(decidePublication(result).status, 'pending')
  assert.ok(!JSON.stringify(result).includes('test-only-key'))
})
test('YouTube trata ausência, resposta inválida, vídeo privado e falhas como incerteza', async () => {
  for (const result of [null, {}, { items: [] }, { items: [null] }, { items: [{ ...item, id: 'other' }] },
    { items: [{ ...item, status: { privacyStatus: 'private', uploadStatus: 'processed' } }] },
    { items: [{ ...item, status: { privacyStatus: 'public', uploadStatus: 'failed' } }] }]) {
    assert.equal((await verify(result)(input)).existence, 'unknown')
  }
  for (const status of [401, 403, 404, 429, 500]) {
    assert.equal((await verify(null, async () => new Response('', { status }))(input)).existence, 'unknown')
  }
  assert.equal((await verify(null, async () => { throw new Error('timeout') })(input)).existence, 'unknown')
})
test('YouTube mantém vídeos sem incorporação pendentes e descarta títulos inválidos', async () => {
  for (const title of ['', 'x'.repeat(501), 'invalid\u0000title']) {
    const result = await verify({ items: [{ ...item, snippet: { title }, status: { ...item.status, embeddable: false } }] })(input)
    assert.equal(result.title, undefined)
    assert.equal(decidePublication(result).status, 'pending')
  }
})
test('YouTube recusa hosts externos e outras plataformas antes de consultar a API', async () => {
  let calls = 0
  const check = verify(null, async () => { calls++; return Response.json({ items: [] }) })
  for (const url of ['https://evil.example/shorts/abcdefghijk', 'https://clips.twitch.tv/ExampleClip']) {
    assert.equal((await check({ url })).existence, 'unknown')
  }
  assert.equal(calls, 0)
  assert.throws(() => createYouTubeVerifier({ apiKey: ' ' }), /key required/)
})
