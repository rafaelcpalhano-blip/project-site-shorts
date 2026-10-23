import test from 'node:test'
import assert from 'node:assert/strict'
import {editManualGame} from '../server/games/edit-manual-game.ts'
import {createManualGame} from '../server/games/manual-game.ts'
import {moderateCatalogGame,loadCatalogGame} from '../server/games/admin-catalog.ts'
import {nameStatePath} from '../server/games/name-keys.ts'
import {validateManualGameDetails,manualGameCoverUrl} from '../src/lib/validation/manual-game-details.ts'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
const visitor='a'.repeat(64),now=()=>new Date('2026-10-22T12:00:00Z')
const details=(patch={})=>({name:'Jogo Renomeado',description:'Descrição brasileira.\nLinha seguinte.',imageUrl:'/images/games/capa.png',releaseDate:'2026-10-22',genres:['Aventura'],gameModes:['Um jogador'],platforms:['PC'],aliases:['Apelido'],...patch})
function memory(){const docs=new Map([[nameStatePath,{version:1,ready:true}]]);let tail=Promise.resolve();const get=async p=>structuredClone(docs.get(p)??null);const store={get,query:async()=>[],countGameShorts:async()=>1,transact(work){const next=tail.then(async()=>{const writes=new Map();const result=await work({get:async p=>{assert.equal(writes.size,0,'all reads precede writes');return get(p)},set:(p,d)=>writes.set(p,d),create:(p,d)=>{assert.ok(!docs.has(p));writes.set(p,d)}});for(const[p,d]of writes)docs.set(p,d);return result});tail=next.catch(()=>{});return next}};return{store,docs,now}}
const create=(deps,name='Jogo Original')=>createManualGame({name},visitor,deps)
const edit=(deps,id,patch={})=>editManualGame({id,revision:0,confirmed:true,reason:'Dados conferidos pelo administrador',details:details(),...patch},'owner',deps)
test('valida campos limitados, datas reais e apenas capas em caminhos aprovados',()=>{
 assert.deepEqual(validateManualGameDetails(details()),details())
 for(const image of ['https://evil.test/a.png','https://127.0.0.1/a.png','data:image/png;base64,x','javascript:alert(1)','/images/games/../private.png','/images/games/a.svg','//evil.test/a.jpg','/images/games/a.png?x=1']){assert.equal(manualGameCoverUrl(image),undefined);assert.throws(()=>validateManualGameDetails(details({imageUrl:image})))}
 for(const patch of [{name:'<img src=x>'},{description:'<script>x</script>'},{description:'x'.repeat(2001)},{name:'a\u200bb'},{genres:['<b>']},{platforms:Array(21).fill('PC')},{releaseDate:'2026-02-30'},{releaseDate:'tomorrow'},{source:'IGDB'},{status:'active'},{externalId:'3'},{aliases:'wrong'}])assert.throws(()=>validateManualGameDetails(details(patch)))
 assert.ok(manualGameCoverUrl('https://images.igdb.com/igdb/image/upload/t_thumb/a.jpg'))
})
test('edição mantém ID, shorts, estados, criação e cotas; reserva nomes antigos e novos',async()=>{
 const deps=memory(),{game:{id}}=await create(deps),before=structuredClone(deps.docs.get('games/'+id));deps.docs.set('shorts/short',{gameId:id,moderationStatus:'published'})
 await edit(deps,id)
 const game=deps.docs.get('games/'+id);assert.equal(game.officialName,'Jogo Renomeado');assert.equal(game.source,'manual');assert.equal(game.reviewStatus,before.reviewStatus);assert.equal(game.status,before.status);assert.equal(game.createdAt.getTime(),before.createdAt.getTime());assert.equal(game.reviewVersion,1)
 assert.equal((await create(deps)).game.id,id);assert.equal((await create(deps,'Jogo Renomeado')).game.id,id);assert.equal(deps.docs.get('shorts/short').gameId,id);assert.equal(deps.docs.get('gameCreationLimits/'+visitor+'-2026-10-22').count,1)
 const logs=[...deps.docs.values()].filter(d=>d.action==='edit-metadata');assert.equal(logs.length,1);assert.equal(logs[0].actorUid,'owner');assert.equal(logs[0].before.officialName,'Jogo Original');assert.equal(logs[0].after.officialName,'Jogo Renomeado')
 const mapped=mapGameDetails(id,game);assert.equal(mapped.description,details().description);assert.equal(mapped.imageUrl,details().imageUrl);assert.equal(mapped.sourceUrl,null);assert.equal(mapped.descriptionPtBr,null)
 assert.equal((await loadCatalogGame({id},deps.store)).metadata.name,'Jogo Renomeado')
})
test('concorrência e versões antigas não duplicam auditoria; colisões e edição de IGDB são recusadas',async()=>{
 const deps=memory(),{game:{id}}=await create(deps)
 const outcomes=await Promise.allSettled([edit(deps,id),edit(deps,id)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.message,'stale-review')
 await create(deps,'Outro Jogo');await assert.rejects(edit(deps,id,{revision:1,details:details({name:'Outro Jogo'})}),/game-name-conflict/)
 deps.docs.set('games/igdb-1',{officialName:'Oficial',source:'IGDB',status:'active'});await assert.rejects(edit(deps,'igdb-1'),/manual-edit-only/)
 for(const patch of [{confirmed:false},{revision:-1},{id:'../bad'},{reason:'x'},{status:'active'}])await assert.rejects(edit(deps,id,patch))
 assert.equal([...deps.docs.values()].filter(d=>d.action==='edit-metadata').length,1)
})
test('editar jogo banido não restaura visibilidade e preserva desbanimento versionado',async()=>{
 const deps=memory(),{game:{id}}=await create(deps)
 await moderateCatalogGame({id,revision:0,confirmed:true,action:'ban',reason:'Motivo de banimento'},'owner',deps)
 await edit(deps,id,{revision:1})
 assert.equal(deps.docs.get('games/'+id).status,'banned');assert.ok((await loadCatalogGame({id},deps.store)).actions.includes('unban'))
 await assert.rejects(create(deps),/game-unavailable/);await assert.rejects(create(deps,'Jogo Renomeado'),/game-unavailable/)
 await moderateCatalogGame({id,revision:2,confirmed:true,action:'unban',reason:'Revisão de banimento'},'owner',deps)
 assert.equal(deps.docs.get('games/'+id).status,'active')
})
test('endpoint de edição exige autorização, origem e corpo seguro e não permite campos privilegiados',async()=>{
 const deps=memory(),{game:{id}}=await create(deps),origin='https://clipzone.test'
 const api=await createPublicApi({...deps,origin,visitorSecret:'ab'.repeat(32),maximumAttempts:30,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{},admin:{authorize:async req=>{if(req.headers.get('authorization')!=='Bearer authorized')throw new AdminAuthError('unauthorized',401);return{uid:'owner'}}}})
 const session=await api(new Request(origin+'/api/session',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'}));const cookie=session.headers.get('set-cookie').split(';')[0]
 const req=(patch={},headers={})=>new Request(origin+'/api/admin/games/edit',{method:'POST',headers:{origin,cookie,'content-type':'application/json',authorization:'Bearer authorized',...headers},body:JSON.stringify({id,revision:0,reason:'Informações conferidas',confirmed:true,details:details(),...patch})})
 assert.equal((await api(req({},{authorization:''}))).status,401);assert.equal((await api(req({},{origin:'https://evil.test'}))).status,403);assert.equal((await api(req({},{'content-type':'text/plain'}))).status,415);assert.equal((await api(req({actorUid:'forged'}))).status,400)
 assert.equal((await api(req())).status,200);assert.equal((await api(req())).status,409)
 assert.equal([...deps.docs.values()].filter(d=>d.action==='edit-metadata').length,1)
})
