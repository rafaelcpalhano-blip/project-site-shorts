import test from 'node:test'
import assert from 'node:assert/strict'
import { createTikTokVerifier } from '../server/videos/tiktok.ts'
import { createMetadataVerifier } from '../server/videos/verify.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const input = { url: 'https://www.tiktok.com/@gamer/video/123456789?tracking=x', gameId: 'lol' }
const data = { type: 'video', version: '1.0', provider_name: 'TikTok', provider_url: 'https://www.tiktok.com', title: 'Jogada', html: '<script>untrusted()</script>', thumbnail_url: 'https://evil.example/image' }
test('TikTok consulta URL canônica no oEmbed oficial e retorna somente evidência textual', async () => {
  const calls = []
  const verify = createTikTokVerifier(async (url, options) => {
    calls.push({ url, options })
    return Response.json(data)
  })
  const result = await verify(input)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.origin + calls[0].url.pathname, 'https://www.tiktok.com/oembed')
  assert.equal(calls[0].url.searchParams.get('url'), 'https://www.tiktok.com/@gamer/video/123456789')
  assert.equal(calls[0].options.redirect, 'error')
  assert.ok(calls[0].options.signal)
  assert.equal(result.existence, 'confirmed')
  assert.equal(result.title, 'Jogada')
  assert.equal(decidePublication(result).status, 'retry')
  assert.ok(!JSON.stringify(result).includes('script'))
  assert.ok(!JSON.stringify(result).includes('evil.example'))
})
test('TikTok mantém respostas incompletas, falhas e conteúdo inacessível inconclusivos', async () => {
  for (const value of [null, {}, { ...data, type: 'rich' }, { ...data, provider_url: 'https://evil.example' }]) {
    assert.equal((await createTikTokVerifier(async () => Response.json(value))(input)).existence, 'unknown')
  }
  for (const status of [403, 404, 429, 500]) {
    assert.equal((await createTikTokVerifier(async () => new Response('', { status }))(input)).existence, 'unknown')
  }
  assert.equal((await createTikTokVerifier(async () => { throw new Error('timeout') })(input)).existence, 'unknown')
})
test('TikTok não consulta destinos arbitrários nem outras plataformas', async () => {
  let calls = 0
  const verify = createTikTokVerifier(async () => { calls++; return Response.json(data) })
  for (const url of ['https://evil.example/@gamer/video/123', 'https://clips.twitch.tv/Example']) await verify({ url })
  assert.equal(calls, 0)
})
test('roteador seleciona a URL e publica evidência técnica completa sem afirmar moderação audiovisual', async () => {
  const calls = []
  const evidence = { existence: 'confirmed', shortFormat: 'confirmed', gameMatch: 'confirmed', moderation: 'clear', flags: [] }
  const adapters = Object.fromEntries(['TikTok', 'YouTube', 'Twitch'].map(platform => [platform, async value => { calls.push({ platform, value }); return evidence }]))
  const verify = createMetadataVerifier(adapters)
  const result = await verify({ ...input, platform: 'Twitch' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].platform, 'TikTok')
  assert.equal(calls[0].value.url, 'https://www.tiktok.com/@gamer/video/123456789')
  assert.equal(calls[0].value.gameId, 'lol')
  assert.equal(result.moderation, 'unavailable')
  assert.equal(decidePublication(result).status, 'published')
})
test('roteador permite nova tentativa para adaptador ausente, erro ou URL inválida', async () => {
  for (const verify of [createMetadataVerifier({}), createMetadataVerifier({ TikTok: async () => { throw new Error('private') } })]) {
    assert.equal(decidePublication(await verify(input)).status, 'retry')
  }
  assert.equal(decidePublication(await createMetadataVerifier({})({ ...input, url: 'invalid' })).status, 'retry')
})
