import test from 'node:test'
import assert from 'node:assert/strict'
import {filterGameOptions} from '../src/features/games/services/game-options.ts'
import {createGameCatalogClient} from '../src/features/games/services/catalog-api.ts'
import {handleGameSearch} from '../server/http/game-search.ts'
import {createIgdbCatalog} from '../server/games/igdb.ts'
const game={externalId:'1',officialName:'Game',releaseDate:null,platforms:[]}

test('palavras fora de ordem e erro moderado preservam nomes/IDs, fortes antes de aproximados',()=>{
 const games=[{id:'a',name:'Counter-Strike 2'},{id:'b',name:'Tibia'},{id:'c',name:'Tibia Quest'},{id:'d',name:'Tibla'},{id:'e',name:'Pokémon Red'}]
 assert.equal(filterGameOptions(games,'strike counter')[0].id,'a')
 assert.equal(filterGameOptions(games,'Tbiia')[0].id,'b')
 assert.equal(filterGameOptions(games,'red POKEMON')[0].name,'Pokémon Red')
 assert.deepEqual(filterGameOptions(games,'Tibia').map(x=>x.id),['b','c','d'])
 assert.deepEqual(filterGameOptions(games,'counter strike 3'),[])
 assert.deepEqual(filterGameOptions(games,'x'.repeat(1000)),[])
 assert.deepEqual(filterGameOptions([{id:'x',name:'A'.repeat(500)}],'A'.repeat(100)),[{id:'x',name:'A'.repeat(500)}])
})
test('cliente pagina por ação explícita, valida avanço e conserva search legado',async()=>{
 const calls=[],client=createGameCatalogClient(async path=>{calls.push(path);return path==='/api/session'?new Response(null,{status:204}):Response.json({games:[game],next:path.includes('cursor=10')?null:10})})
 assert.deepEqual(await client.searchPage('Game'),{games:[game],next:10})
 assert.deepEqual(await client.searchPage('Game',10),{games:[game],next:null})
 assert.ok(calls.includes('/api/games/search?q=Game&cursor=10'))
 assert.deepEqual(await client.search('Game'),[game])
 await assert.rejects(client.searchPage('Game',-1));assert.equal(calls.length,6)
 const bad=createGameCatalogClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({games:[game],next:0}))
 await assert.rejects(bad.searchPage('Game'),/inválida/)
})
test('endpoint limita dez e revela próxima página sem expor campos privados; cursor inválido nem consulta',async()=>{
 let offset=-1,calls=0
 const dep={origin:'https://site.test',resolveVisitor:async()=>'a'.repeat(64),checkAbuse:async()=>{},search:async(_name,page)=>{calls++;offset=page;return Array.from({length:11},(_,i)=>({...game,externalId:String(i+1),secret:'hidden'}))}}
 const request=query=>new Request('https://site.test/api/games/search'+query)
 const first=await (await handleGameSearch(request('?q=Game&cursor=10'),dep)).json()
 assert.equal(offset,10);assert.equal(first.games.length,10);assert.equal(first.next,20);assert.equal(first.games[0].secret,undefined)
 for(const query of ['?q=Game&cursor=-1','?q=Game&cursor=1','?q=Game&cursor=10&cursor=20','?q=Game&cursor=9007199254740992'])assert.equal((await handleGameSearch(request(query),dep)).status,400)
 assert.equal(calls,1)
})
test('adaptador IGDB escapa entrada e solicita lookahead limitado na página seguinte',async()=>{
 let body='';const catalog=createIgdbCatalog({clientId:'test',clientSecret:'test'},async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'fake',expires_in:3600});body=options.body;return Response.json([])})
 await catalog.search('Game',10);assert.ok(body.endsWith('search "Game"; limit 11; offset 10;'))
 await assert.rejects(catalog.search('Game',-10))
})
