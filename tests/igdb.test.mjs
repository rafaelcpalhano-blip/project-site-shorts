import test from 'node:test'
import assert from 'node:assert/strict'
import { createIgdbCatalog } from '../server/games/igdb.ts'
test('IGDB usa endpoints fixos, credenciais no corpo e resultados oficiais', async () => {
  const calls = []
  const catalog = createIgdbCatalog({clientId:'test-id',clientSecret:'test-secret'},async (url,init) => {
    calls.push({url,init})
    if (url === 'https://id.twitch.tv/oauth2/token') return Response.json({access_token:'test-token',expires_in:3600})
    return Response.json([{id:1,name:'Portal',url:'https://www.igdb.com/games/portal',cover:{url:'//images.igdb.com/igdb/image/upload/t_thumb/example.jpg'}},{id:2,name:'Portal 2'}])
  })
  const games = await catalog.search('Portal')
  assert.equal(games.length,2)
  assert.equal(games[0].officialName,'Portal')
  assert.equal(games[0].imageUrl.startsWith('https://images.igdb.com/'),true)
  await catalog.get('1')
  assert.equal(calls.filter(call=>call.url.includes('oauth2')).length,1)
  assert.ok(calls.every(call=>!call.url.includes('test-secret')))
  assert.equal(calls[1].init.headers.Authorization,'Bearer test-token')
})
test('busca escapa aspas e IDs não aceitam instruções de consulta', async () => {
  let body
  const catalog = createIgdbCatalog({clientId:'id',clientSecret:'secret'},async (url,init) => {
    if (url.includes('oauth2')) return Response.json({access_token:'token',expires_in:3600})
    body = init.body
    return Response.json([])
  })
  await catalog.search('Game"; limit 500; "')
  assert.ok(body.includes('search "Game\\"; limit 500; \\""; limit 10;'))
  await assert.rejects(catalog.get('1; where id > 0'),/inválido/)
})
test('indisponibilidade não inventa resultados e URLs não oficiais são descartadas', async () => {
  const failing = createIgdbCatalog({clientId:'id',clientSecret:'secret'},async ()=>new Response('',{status:503}))
  await assert.rejects(failing.search('Portal'),/autenticar/)
  const catalog = createIgdbCatalog({clientId:'id',clientSecret:'secret'},async url =>
    url.includes('oauth2') ? Response.json({access_token:'token',expires_in:3600}) :
      Response.json([{id:1,name:'Portal',cover:{url:'https://evil.example/image.jpg'},url:'javascript:alert(1)'}]))
  assert.deepEqual((await catalog.get('1')).imageUrl,null)
  assert.deepEqual((await catalog.get('1')).sourceUrl,null)
})

