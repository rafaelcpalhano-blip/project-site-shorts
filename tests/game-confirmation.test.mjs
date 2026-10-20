import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmGame } from '../server/games/confirm-game.ts'
import { handleGameConfirmation } from '../server/http/game-confirmation.ts'
const official = { externalId: '1', officialName: 'Official Game', description: '', aliases: [], genres: [], gameModes: [], platforms: [], releaseDate: null, imageUrl: null, sourceUrl: null }
function setup() {
  const docs = new Map()
  let tail = Promise.resolve()
  const store = { transact(work) {
    const next = tail.then(async () => {
      const writes = new Map()
      const result = await work({ get: async path => docs.get(path) ?? null, create: (path, value) => writes.set(path, value) })
      for (const [path, value] of writes) docs.set(path, value)
      return result
    })
    tail = next.catch(() => {})
    return next
  } }
  return { docs, store, get: async () => official, now: () => new Date() }
}
test('confirmação usa dados oficiais e identidade determinística para submissões repetidas', async () => {
  const deps = setup()
  const results = await Promise.all([confirmGame({ externalId: '1' }, deps), confirmGame({ externalId: '1' }, deps)])
  assert.equal(results.filter(result => result.created).length, 1)
  assert.equal(deps.docs.size, 1)
  assert.equal(deps.docs.get('games/igdb-1').officialName, 'Official Game')
})
test('confirmação rejeita metadados do cliente, ausência e catálogo inconsistente sem gravar', async () => {
  const deps = setup()
  await assert.rejects(() => confirmGame({ externalId: '1', officialName: 'Fake' }, deps), { code: 'invalid-input' })
  await assert.rejects(() => confirmGame({ externalId: '1' }, { ...deps, get: async () => null }), { code: 'game-not-found' })
  await assert.rejects(() => confirmGame({ externalId: '1' }, { ...deps, get: async () => ({ ...official, externalId: '2' }) }), { code: 'invalid-catalog' })
  assert.equal(deps.docs.size, 0)
})
test('confirmação não reativa jogo desabilitado pelo administrador', async () => {
  const deps = setup()
  deps.docs.set('games/igdb-1', { ...official, source: 'IGDB', status: 'disabled' })
  await assert.rejects(() => confirmGame({ externalId: '1' }, deps), { code: 'game-unavailable' })
  assert.equal(deps.docs.get('games/igdb-1').status, 'disabled')
})
test('HTTP confirma somente com sessão, origem e entrada válidas; limita corpo', async () => {
  const origin = 'https://clipzone.example'
  const request = (body = '{"externalId":"1"}', extra = {}) => new Request(origin + '/api/games/confirm', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...extra }, body })
  const deps = { ...setup(), origin, resolveVisitor: async () => 'a'.repeat(64), checkAbuse: async () => {} }
  assert.equal((await handleGameConfirmation(request())).status, 503)
  assert.equal((await handleGameConfirmation(request(), { ...deps, resolveVisitor: async () => null })).status, 401)
  assert.equal((await handleGameConfirmation(request(undefined, { origin: 'https://evil.example' }), deps)).status, 403)
  assert.equal((await handleGameConfirmation(request('x'.repeat(8193)), deps)).status, 413)
  assert.equal((await handleGameConfirmation(request(), deps)).status, 201)
  assert.equal((await handleGameConfirmation(request(), deps)).status, 200)
})
