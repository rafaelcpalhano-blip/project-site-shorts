import test from 'node:test'
import assert from 'node:assert/strict'
import {readGames,readGame} from '../server/public/read-games.ts'
import {handlePublicRead} from '../server/http/public-read.ts'
import {createPublicReadClient} from '../src/lib/firebase/public-read-api.ts'
import {loadPublicGames} from '../src/features/games/services/load-public-games.ts'
import {createGameCatalogPageCache,invalidateGameCatalog} from '../src/features/games/services/catalog-cache.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
const origin='https://clipzone.test',visitor='a'.repeat(64)
const rows=Array.from({length:121},(_,i)=>({id:'g'+String(i).padStart(3,'0'),data:{status:i===120?'banned':'active',source:'manual',officialName:'Jogo '+String(i).padStart(3,'0'),privateFlag:'NEVER EXPOSE'}}))
function store(){return {get:async path=>rows.find(row=>'games/'+row.id===path)?.data??null,publicGamesPage:async cursor=>rows.filter(row=>row.data.status==='active'&&(!cursor||row.data.officialName>cursor.name||row.data.officialName===cursor.name&&row.id>cursor.id)).slice(0,51)}}
test('catálogo paginado 50/50/20 publica apenas ID/nome e exclui banidos; detalhe não vaza privados',async()=>{
 const db=store(),one=await readGames({},db),two=await readGames({cursor:one.next},db),three=await readGames({cursor:two.next},db)
 assert.deepEqual([one.items.length,two.items.length,three.items.length],[50,50,20]);assert.equal(three.next,null)
 assert.equal(new Set([...one.items,...two.items,...three.items].map(game=>game.id)).size,120)
 assert.ok(!JSON.stringify(one).includes('privateFlag'));assert.deepEqual(Object.keys(one.items[0]).sort(),['id','name'])
 assert.ok(!JSON.stringify(await readGame({gameId:'g000'},db)).includes('NEVER EXPOSE'))
 for(const gameId of ['g120','absent'])await assert.rejects(readGame({gameId},db),e=>e.status===404)
})
test('HTTP de jogos preserva sessão, origem, corpo e limites; cliente só usa caminhos relativos',async()=>{
 const db=store(),paths=[],deps={origin,store:db,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}}
 const client=createPublicReadClient(async(path,options)=>{paths.push(path);assert.ok(path.startsWith('/api/'));assert.ok(!path.includes('8080'));return path==='/api/session'?new Response(null,{status:204}):handlePublicRead(new Request(origin+path,{...options,headers:{...options.headers,origin}}),deps)})
 assert.equal((await loadPublicGames(client.listGames)).length,120)
 assert.equal((await client.getGame('g000')).name,'Jogo 000');assert.equal(await client.getGame('g120'),null)
 const req=(path,body={},extra={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...extra},body:JSON.stringify(body)})
 for(const path of ['/api/games/list','/api/games/detail']){
  assert.equal((await handlePublicRead(req(path,{}, {origin:'https://other.test'}),deps)).status,403)
  assert.equal((await handlePublicRead(req(path),{...deps,resolveVisitor:async()=>null})).status,401)
 }
 assert.equal((await handlePublicRead(req('/api/games/list',{cursor:{id:'x',name:3}}),deps)).status,400)
 assert.equal((await handlePublicRead(req('/api/games/detail',{gameId:'../admin'}),deps)).status,400)
 assert.equal(paths.filter(p=>p==='/api/games/list').length,3)
})
test('feed/formulário compartilham catálogo completo, sem duplicar páginas; retry funciona após falha',async()=>{
 let count=0,fail=true;const db=store(),cached=createGameCatalogPageCache(async cursor=>{count++;if(fail)throw Error('offline');return readGames(cursor?{cursor}:{},db)})
 await assert.rejects(loadPublicGames(cached),/offline/);fail=false
 const [feed,form]=await Promise.all([loadPublicGames(cached),loadPublicGames(cached)])
 assert.deepEqual(feed,form);assert.equal(feed.length,120);assert.equal(count,4)
 invalidateGameCatalog();await loadPublicGames(cached);assert.equal(count,7)
 await assert.rejects(loadPublicGames(async()=>({items:[],next:'same'})),/não avançou/)
})
test('REST usa projeção pública, filtro ativo, desempate e cursor de nome/ID no servidor',async()=>{
 const original=globalThis.fetch,queries=[]
 try{
  globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('http://127.0.0.1:8081/'));queries.push(JSON.parse(options.body).structuredQuery);return Response.json([])}
  const db=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081})
  await db.publicGamesPage();await db.publicGamesPage({id:'g049',name:'Jogo 049'})
  assert.equal(queries[0].limit,51);assert.equal(queries[0].where.fieldFilter.value.stringValue,'active')
  assert.deepEqual(queries[0].select.fields.map(f=>f.fieldPath),['officialName','status'])
  assert.deepEqual(queries[0].orderBy.map(f=>f.field.fieldPath),['officialName','__name__'])
  assert.equal(queries[1].startAt.before,false);assert.equal(queries[1].startAt.values[0].stringValue,'Jogo 049')
  assert.ok(queries[1].startAt.values[1].referenceValue.endsWith('/games/g049'))
 }finally{globalThis.fetch=original}
})
test('catálogo com rate-limit não repete sozinho nem armazena a falha',async()=>{
 let calls=0;const client=createPublicReadClient(async()=>{calls++;return new Response(null,{status:429})})
 await assert.rejects(client.listGames(),e=>e.kind==='rate-limit');assert.equal(calls,1)
})
