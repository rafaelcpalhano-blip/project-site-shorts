import test from 'node:test'
import assert from 'node:assert/strict'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
import {requestGame,loadGameRequests,reviewGameRequest} from '../server/games/requests.ts'
import {handleGameRequest} from '../server/http/game-requests.ts'
import {handleAdminModeration} from '../server/http/admin-moderation.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
import {createGameCatalogClient} from '../src/features/games/services/catalog-api.ts'
import {createPublicApi} from '../server/http/public-api.ts'
const visitor='b'.repeat(64),now=()=>new Date('2026-10-21T15:00:00Z'),origin='https://clipzone.test'
function memory(){
 const records=new Map();let tail=Promise.resolve()
 const store={transact(work){const result=tail.then(async()=>{
  const writes=new Map();const result=await work({get:async path=>{assert.equal(writes.size,0);return structuredClone(records.get(path)??null)},
   create:(path,data)=>{assert.ok(!records.has(path));writes.set(path,data)},set:(path,data)=>writes.set(path,data)})
  for(const [path,data] of writes)records.set(path,data);return result
 });tail=result.catch(()=>{});return result},async query(q){
  let rows=[...records].filter(([path,data])=>path.startsWith(q.collection+'/')&&data[q.filter.field]===q.filter.value).map(([path,data])=>({id:path.split('/')[1],data}))
   .sort((a,b)=>b.data[q.orderBy]-a.data[q.orderBy]||b.id.localeCompare(a.id))
  if(q.cursor)rows=rows.filter(row=>row.data[q.orderBy].toISOString()<q.cursor.time||row.data[q.orderBy].toISOString()===q.cursor.time&&row.id<q.cursor.id)
  return rows.slice(0,q.limit)
 }};return {store,records,now}
}
const post=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})
const review=(id,patch={})=>({id,action:'link',gameId:'igdb-1',revision:0,reason:'Jogo oficial conferido',...patch})
const seedGame=deps=>deps.records.set('games/igdb-1',{officialName:'Portal',externalId:'1',source:'IGDB',status:'active'})

test('ficha tolera metadados ausentes, preserva texto e só expõe URLs oficiais seguras',()=>{
 const basic=mapGameDetails('legacy',{officialName:'Jogo',status:'active'})
 assert.deepEqual(basic.platforms,[]);assert.equal(basic.description,'');assert.equal(basic.source,null)
 const data={officialName:'Portal',status:'active',source:'IGDB',description:'<script>alert(1)</script>',aliases:['Portal','Portal',3],
  genres:['Puzzle'],gameModes:['Single player'],platforms:['PC'],releaseDate:'2007-10-10',imageUrl:'https://images.igdb.com/igdb/image/upload/t_thumb/a.jpg',sourceUrl:'https://www.igdb.com/games/portal'}
 const game=mapGameDetails('igdb-1',data);assert.equal(game.description,data.description);assert.equal(game.aliases.length,1);assert.equal(game.releaseDate,'2007-10-10');assert.ok(game.imageUrl)
 for(const url of ['javascript:alert(1)','http://images.igdb.com/igdb/image/upload/a','https://images.igdb.com.evil.test/igdb/image/upload/a','https://evil.test/a','https://x@images.igdb.com/igdb/image/upload/a','https://images.igdb.com:444/igdb/image/upload/a'])assert.equal(mapGameDetails('id',{...data,imageUrl:url}).imageUrl,null)
 assert.equal(mapGameDetails('id',{...data,sourceUrl:'https://www.igdb.com.evil.test/games/portal'}).sourceUrl,null)
 assert.equal(mapGameDetails('id',{...data,releaseDate:'2026-02-30'}).releaseDate,null)
 assert.throws(()=>mapGameDetails('id',{...data,status:'disabled'}))
})
test('solicitações concorrentes são idempotentes por visitante e nome, privadas e sem cota de vídeo',async()=>{
 const deps=memory(),results=await Promise.all([requestGame({name:'Pórtal'},visitor,deps),requestGame({name:'PORTAL'},visitor,deps)])
 assert.equal(results[0].id,results[1].id);assert.equal(results.filter(r=>r.repeated).length,1);assert.equal(deps.records.size,1)
 assert.equal(results[0].status,'pending');assert.ok(!JSON.stringify(results).includes(visitor))
 assert.notEqual((await requestGame({name:'Portal'},'c'.repeat(64),deps)).id,results[0].id)
 for(const data of [{name:'Portal',status:'linked'},{name:'Portal',visitorHash:visitor},{name:''},{name:'x'.repeat(101)},{name:'a\nb'}])await assert.rejects(requestGame(data,visitor,deps),/invalid-input/)
})
test('vínculo exige jogo IGDB ativo, motivo e revisão; concorrência decide e audita uma vez',async()=>{
 const deps=memory(),{id}=await requestGame({name:'Portal'},visitor,deps)
 await assert.rejects(reviewGameRequest(review(id),'owner',deps),/invalid-game/)
 seedGame(deps)
 for(const patch of [{reason:'x'},{revision:-1},{gameId:'../private'},{actorUid:'forged'},{action:'reject',gameId:'igdb-1'}])await assert.rejects(reviewGameRequest(review(id,patch),'owner',deps),/invalid-input/)
 const results=await Promise.allSettled([reviewGameRequest(review(id),'owner',deps),reviewGameRequest(review(id),'owner',deps)])
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.message,'stale-review')
 const logs=[...deps.records].filter(([path])=>path.startsWith('moderationLogs/'));assert.equal(logs.length,1);assert.equal(logs[0][1].actorUid,'owner')
 const repeated=await requestGame({name:'Portal'},visitor,deps);assert.deepEqual(repeated.game,{id:'igdb-1',name:'Portal'})
 deps.records.get('games/igdb-1').status='disabled';assert.equal((await requestGame({name:'Portal'},visitor,deps)).game,null)
})
test('rejeição conserva registro e motivo; filas são privadas, paginadas e não vazam identidade',async()=>{
 const deps=memory();for(let i=0;i<23;i++)await requestGame({name:'Game '+i},visitor,deps)
 const first=await loadGameRequests({status:'pending'},deps.store),second=await loadGameRequests({status:'pending',cursor:first.next},deps.store)
 assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,23)
 assert.ok(!JSON.stringify(first).includes(visitor));const id=first.items[0].id
 await reviewGameRequest({id,action:'reject',revision:0,reason:'Nome não encontrado no catálogo'},'owner',deps)
 assert.equal((await loadGameRequests({status:'rejected'},deps.store)).items[0].id,id)
 await assert.rejects(loadGameRequests({status:'pending',cursor:{time:now().toISOString(),id:'../private'}},deps.store),/invalid-input/)
 assert.equal([...deps.records.keys()].filter(p=>p.startsWith('games/')).length,0)
})
test('HTTP exige origem, sessão, corpo limitado e não revela erros internos',async()=>{
 const deps={...memory(),origin,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}}
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Portal'}),deps)).status,201)
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Portal'}),deps)).status,200)
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Portal'},{origin:'https://evil.test'}),deps)).status,403)
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Portal'}),{...deps,resolveVisitor:async()=>null})).status,401)
 assert.equal((await handleGameRequest(post('/api/games/requests','x'.repeat(8193)),deps)).status,413)
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Portal',status:'linked'}),deps)).status,400)
 const failure=await handleGameRequest(post('/api/games/requests',{name:'Portal'}),{...deps,store:{transact:async()=>{throw new Error('secret-token')}}})
 assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('secret'))
})
test('novas rotas administrativas verificam autorização a cada chamada antes de consultar ou decidir',async()=>{
 const deps=memory();let calls=0
 const options={...deps,origin,checkAbuse:async()=>true,verify:async()=>{},admin:{authorize:async request=>{calls++;if(request.headers.get('authorization')!=='Bearer owner')throw new AdminAuthError('unauthorized',401);return {uid:'owner'}}}}
 for(const path of ['/api/admin/games/queue','/api/admin/games/review'])assert.equal((await handleAdminModeration(post(path,{status:'pending'}),options)).status,401)
 const response=await handleAdminModeration(post('/api/admin/games/queue',{status:'pending'},{authorization:'Bearer owner'}),options)
 assert.equal(response.status,200);assert.equal(calls,3)
})
test('composição usa limite próprio sem consumir cota, cliente só envia nome e preserva erro seguro',async()=>{
 const deps=memory(),api=await createPublicApi({...deps,origin,visitorSecret:'ab'.repeat(32),maximumAttempts:1,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}})
 const session=await api(post('/api/session',{})),cookie=session.headers.get('set-cookie').split(';')[0]
 assert.equal((await api(post('/api/games/requests',{name:'Portal'},{cookie}))).status,201)
 assert.equal((await api(post('/api/games/requests',{name:'Portal 2'},{cookie}))).status,429)
 assert.ok([...deps.records.keys()].some(p=>p.startsWith('gameRequestAttempts/')))
 assert.ok(![...deps.records.keys()].some(p=>/^(submissionLimits|submissionAttempts|gameSearchAttempts)\//.test(p)))
 const requests=[],client=createGameCatalogClient(async(path,init)=>{requests.push({path,init});return Response.json(path==='/api/session'?{}:{status:'pending',game:null})})
 assert.equal((await client.request(' Portal ')).status,'pending');assert.deepEqual(JSON.parse(requests[1].init.body),{name:'Portal'})
 const failing=createGameCatalogClient(async path=>path==='/api/session'?Response.json({}):Response.json({error:'secret'},{status:503}))
 await assert.rejects(failing.request('Portal'),/campos foram preservados/)
})

const manualDecision=(id,name,patch={})=>({id,action:'create',name,revision:0,reason:'Cadastro manual conferido pelo administrador',...patch})
test('aprovação manual cria jogo vazio e vincula atomicamente; nomes equivalentes reutilizam cadastro',async()=>{
 const deps=memory(),first=await requestGame({name:'Meu jogo'},visitor,deps),second=await requestGame({name:'Outro pedido'},visitor,deps)
 await Promise.all([reviewGameRequest(manualDecision(first.id,'Meu Jogo'),'owner',deps),reviewGameRequest(manualDecision(second.id,'MEU JÓGO'),'owner',deps)])
 const games=[...deps.records].filter(([path])=>path.startsWith('games/'));assert.equal(games.length,1)
 const [path,game]=games[0];assert.match(path,/games\/manual-[a-f0-9]{64}$/);assert.equal(game.source,'manual');assert.equal(game.description,'');assert.equal(game.imageUrl,null);assert.equal(game.externalId,null)
 const result=await requestGame({name:'Meu jogo'},visitor,deps);assert.equal(result.status,'linked');assert.equal(result.game.id,path.slice(6))
 const details=mapGameDetails(result.game.id,game);assert.equal(details.source,'manual');assert.equal(details.description,'');assert.equal(details.descriptionPtBr,null)
 assert.equal([...deps.records.keys()].filter(path=>path.startsWith('moderationLogs/')).length,2)
 assert.ok(![...deps.records.keys()].some(path=>path.startsWith('submissionLimits/')))
})
test('cadastro manual rejeita campos privilegiados e não reativa jogo desativado',async()=>{
 const deps=memory(),first=await requestGame({name:'Meu jogo'},visitor,deps)
 for(const patch of [{name:''},{name:'x'.repeat(101)},{name:'Jogo\nruim'},{source:'IGDB'},{description:'inventada'},{imageUrl:'https://evil.test'},{gameId:'igdb-1'}])await assert.rejects(reviewGameRequest(manualDecision(first.id,'Meu jogo',patch),'owner',deps),/invalid-input/)
 assert.equal(deps.records.size,1)
 await reviewGameRequest(manualDecision(first.id,'Meu jogo'),'owner',deps)
 const gameId=deps.records.get('gameRequests/'+first.id).gameId;deps.records.get('games/'+gameId).status='disabled'
 const second=await requestGame({name:'Pedido de jogo'},visitor,deps)
 await assert.rejects(reviewGameRequest(manualDecision(second.id,'MEU JOGO'),'owner',deps),/invalid-game/)
 assert.equal(deps.records.get('gameRequests/'+second.id).status,'pending')
})
test('criação manual exige autorização do servidor e público não consegue aprovar solicitações',async()=>{
 const deps=memory(),{id}=await requestGame({name:'Meu jogo'},visitor,deps)
 const response=await handleAdminModeration(post('/api/admin/games/review',manualDecision(id,'Meu jogo')),{...deps,origin,checkAbuse:async()=>true,verify:async()=>{},admin:{authorize:async()=>{throw new AdminAuthError('unauthorized',401)}}})
 assert.equal(response.status,401);assert.equal(deps.records.size,1)
 const handler={...deps,origin,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}}
 assert.equal((await handleGameRequest(post('/api/games/requests',{name:'Meu jogo',action:'create'}),handler)).status,400)
})
test('cliente reconhece jogo manual aprovado sem relaxar identificadores IGDB ou aceitar caminhos arbitrários',async()=>{
 const id='manual-'+'a'.repeat(64)
 const client=createGameCatalogClient(async path=>Response.json(path==='/api/session'?{}:{status:'linked',game:{id,name:'Meu jogo'}}))
 assert.equal((await client.request('Meu jogo')).game.id,id)
 const invalid=createGameCatalogClient(async path=>Response.json(path==='/api/session'?{}:{status:'linked',game:{id:'manual-../private',name:'Meu jogo'}}))
 await assert.rejects(invalid.request('Meu jogo'),/inválida/)
})
