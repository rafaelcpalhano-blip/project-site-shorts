import test from 'node:test'
import assert from 'node:assert/strict'
import { handleGameSearch } from '../server/http/game-search.ts'
import { SubmissionError } from '../server/submissions/submit-short.ts'
import { createAttemptLimiter } from '../server/security/attempt-limit.ts'
const origin = 'https://clipzone.example'
const request = (query = '?q=League', headers = {}) => new Request(origin + '/api/games/search' + query, { headers })
const game = { externalId: '1', officialName: 'League of Legends', releaseDate: null, platforms: ['PC'], privateExtra: 'secret' }
const dependencies = { origin, resolveVisitor: async () => 'a'.repeat(64), checkAbuse: async () => {}, search: async () => [game] }
test('pesquisa exige sessão e configuração; rejeita origem cruzada e consulta inválida antes do IGDB', async () => {
  assert.equal((await handleGameSearch(request())).status, 503)
  assert.equal((await handleGameSearch(request(), { ...dependencies, resolveVisitor: async () => null })).status, 401)
  for (const headers of [{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }]) {
    assert.equal((await handleGameSearch(request(undefined, headers), dependencies)).status, 403)
  }
  for (const query of ['', '?q=', '?q=a&q=b', '?q=a&admin=true', '?q=' + 'x'.repeat(101)]) {
    assert.equal((await handleGameSearch(request(query), dependencies)).status, 400)
  }
})
test('pesquisa limita resultados e retorna apenas dados de seleção com atribuição', async () => {
  const response = await handleGameSearch(request(), { ...dependencies, search: async () => Array(12).fill(game) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const result = await response.json()
  assert.equal(result.games.length, 10)
  assert.equal(result.source, 'IGDB')
  assert.equal(result.games[0].privateExtra, undefined)
  assert.deepEqual((await (await handleGameSearch(request(), { ...dependencies, search: async () => [] })).json()).games, [])
})
test('limite impede consulta e erros internos não vazam', async () => {
  let calls = 0
  const response = await handleGameSearch(request(), { ...dependencies, checkAbuse: async () => { throw new SubmissionError('abuse-limit') }, search: async () => { calls++; return [] } })
  assert.equal(response.status, 429)
  assert.equal(calls, 0)
  const failed = await handleGameSearch(request(), { ...dependencies, search: async () => { throw new Error('secret-token') } })
  assert.equal(failed.status, 503)
  assert.ok(!(await failed.text()).includes('secret-token'))
})
test('pesquisa não consome contador de submissão ou cota de publicação', async () => {
  const paths = []
  const store = { transact: async work => work({ get: async () => null, set: path => paths.push(path) }) }
  const limit = createAttemptLimiter({ store, now: () => new Date(), maximum: 10, windowMs: 60000, scope: 'game-search' })
  await limit('a'.repeat(64))
  assert.deepEqual(paths, ['gameSearchAttempts/' + 'a'.repeat(64)])
})
