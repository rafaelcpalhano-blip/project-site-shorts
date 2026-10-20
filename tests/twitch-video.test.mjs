import test from 'node:test'
import assert from 'node:assert/strict'
import { createTwitchClipVerifier } from '../server/videos/twitch.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const input = { url: 'https://clips.twitch.tv/ExampleClip', gameId: 'lol' }
const clip = { id: 'ExampleClip', title: 'Boa jogada', duration: 24.5, game_id: '21779' }
function verifier(data, patch = {}) {
  return createTwitchClipVerifier({ clientId: 'test-client', accessToken: async () => 'test-token',
    twitchGameId: async () => '21779', fetcher: async () => Response.json(data), ...patch })
}
test('Twitch consulta somente API oficial e confirma metadados sem liberar moderação', async () => {
  const verify = verifier(null, { fetcher: async (url, options) => {
    assert.equal(String(url), 'https://api.twitch.tv/helix/clips?id=ExampleClip')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.ok(options.signal)
    return Response.json({ data: [clip] })
  } })
  const result = await verify(input)
  assert.equal(result.existence, 'confirmed')
  assert.equal(result.shortFormat, 'confirmed')
  assert.equal(result.gameMatch, 'confirmed')
  assert.equal(result.title, clip.title)
  assert.equal(result.moderation, 'unavailable')
  assert.equal(decidePublication(result).status, 'pending')
})
test('Twitch distingue ausência de falhas, resposta malformada e identidade inesperada', async () => {
  assert.equal((await verifier({ data: [] })(input)).existence, 'missing')
  for (const data of [null, {}, { data: [{}] }, { data: [{ ...clip, id: 'Other' }] }]) {
    assert.equal((await verifier(data)(input)).existence, 'unknown')
  }
  for (const status of [401, 403, 429, 500]) {
    assert.equal((await verifier(null, { fetcher: async () => new Response('', { status }) })(input)).existence, 'unknown')
  }
  assert.equal((await verifier(null, { fetcher: async () => { throw new Error('timeout') } })(input)).existence, 'unknown')
})
test('Twitch não infere jogo nem formato quando metadados faltam', async () => {
  assert.equal((await verifier({ data: [{ ...clip, game_id: '999' }] })(input)).gameMatch, 'mismatch')
  const result = await verifier({ data: [{ ...clip, duration: null, title: 'x'.repeat(501), game_id: '' }] })(input)
  assert.equal(result.gameMatch, 'unknown')
  assert.equal(result.shortFormat, 'unknown')
  assert.equal(result.title, undefined)
  assert.equal((await verifier({ data: [clip] }, { twitchGameId: async () => null })(input)).gameMatch, 'unknown')
})
test('links não Twitch ou host arbitrário não provocam requisições', async () => {
  let calls = 0
  const verify = verifier(null, { fetcher: async () => { calls++; return Response.json({ data: [] }) } })
  for (const url of ['https://example.com/ExampleClip', 'https://www.youtube.com/shorts/abcdefghijk']) {
    assert.equal((await verify({ ...input, url })).existence, 'unknown')
  }
  assert.equal(calls, 0)
})

