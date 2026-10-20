import test from 'node:test'
import assert from 'node:assert/strict'
import { createGameCatalogClient } from '../src/features/games/services/catalog-api.ts'
test('cliente pesquisa com sessão, codifica texto e confirma apenas ID escolhido', async () => {
  const calls = []
  const client = createGameCatalogClient(async (path, options) => {
    calls.push({ path, options })
    if (path === '/api/session') return new Response(null, { status: 204 })
    if (path.startsWith('/api/games/search')) return Response.json({ games: [{ externalId: '1', officialName: 'Game', releaseDate: null, platforms: [] }] })
    return Response.json({ id: 'igdb-1', name: 'Game' }, { status: 201 })
  })
  assert.equal((await client.search('Game & More'))[0].externalId, '1')
  assert.equal(calls[1].path, '/api/games/search?q=Game%20%26%20More')
  assert.deepEqual(await client.confirm('1'), { id: 'igdb-1', name: 'Game' })
  assert.deepEqual(JSON.parse(calls[3].options.body), { externalId: '1' })
  assert.equal(calls[3].options.credentials, 'same-origin')
})
test('cliente não repete confirmações nem exibe erros internos', async () => {
  let calls = 0
  const client = createGameCatalogClient(async path => {
    calls++
    return path === '/api/session' ? new Response(null, { status: 204 }) : Response.json({ error: 'secret-provider-detail' }, { status: 503 })
  })
  await assert.rejects(() => client.confirm('1'), /Catálogo indisponível/)
  assert.equal(calls, 2)
})
test('cliente rejeita entrada e identidade de confirmação inconsistentes', async () => {
  const client = createGameCatalogClient(async path => path === '/api/session' ? new Response(null, { status: 204 }) : Response.json({ id: 'igdb-2', name: 'Other' }))
  await assert.rejects(() => client.confirm('1'), /Não foi possível confirmar/)
  await assert.rejects(() => client.confirm('../bad'), /Selecione/)
  await assert.rejects(() => client.search(''))
})
