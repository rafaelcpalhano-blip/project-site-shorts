import test from 'node:test'
import assert from 'node:assert/strict'
import { createTwitchGameResolver } from '../server/games/twitch-mapping.ts'
const game = { status: 'active', source: 'IGDB', externalId: '115' }
function resolver(record = game, data = { data: [{ id: '21779', igdb_id: '115' }] }, fetcher) {
  return createTwitchGameResolver({ clientId: 'test', accessToken: async () => 'token',
    store: { transact: async work => work({ get: async () => record }) },
    fetcher: fetcher || (async () => Response.json(data)),
  })
}
test('uses official IGDB identity and fixed Helix endpoint', async () => {
  const resolve = resolver(game, null, async (url, options) => {
    assert.equal(String(url), 'https://api.twitch.tv/helix/games?igdb_id=115')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, 'Bearer token')
    return Response.json({ data: [{ id: '21779', igdb_id: '115' }] })
  })
  assert.equal(await resolve('igdb-115'), '21779')
})
test('invalid, disabled and inconsistent catalog entries never call Twitch', async () => {
  const forbidden = async () => assert.fail('unexpected provider call')
  for (const record of [null, { ...game, status: 'disabled' }, { ...game, source: 'visitor' }, { ...game, externalId: '116' }]) {
    assert.equal(await resolver(record, null, forbidden)('igdb-115'), null)
  }
  assert.equal(await resolver(game, null, forbidden)('../private'), null)
})
test('missing, ambiguous, mismatched and failed provider responses remain inconclusive', async () => {
  for (const data of [{}, { data: [] }, { data: [{ id: '21779', igdb_id: '116' }] }, { data: [{ id: 'x', igdb_id: '115' }] }, { data: [{}, {}] }]) {
    assert.equal(await resolver(game, data)('igdb-115'), null)
  }
  assert.equal(await resolver(game, null, async () => new Response(null, { status: 401 }))('igdb-115'), null)
  assert.equal(await resolver(game, null, async () => { throw new Error('offline') })('igdb-115'), null)
})
