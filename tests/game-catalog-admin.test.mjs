import test from 'node:test'
import assert from 'node:assert/strict'
import {loadGameCatalog,loadCatalogGame,moderateCatalogGame} from '../server/games/admin-catalog.ts'
import {nameStatePath} from '../server/games/name-keys.ts'
import {createManualGame} from '../server/games/manual-game.ts'
import {handleAdminModeration} from '../server/http/admin-moderation.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
import {createPublicApi} from '../server/http/public-api.ts'
const now=()=>new Date('2026-10-21T12:00:00Z'),visitor='a'.repeat(64),origin='https://clipzone.test'
function memory(){
 const docs=new Map([[nameStatePath,{version:1,ready:true}]]);let tail=Promise.resolve();const queries=[]
 const get=async p=>structuredClone(docs.get(p)??null)
 const store={get,async gameCatalogPage(q){queries.push(q);let rows=[...docs].filter(([p,d])=>p.startsWith('games/')&&(q.filter==='all'||q.filter==='provisional'?p.startsWith('games/')&&(q.filter==='all'||d.status==='active'&&d.reviewStatus==='provisional'):q.filter==='hidden'?['hidden','disabled','inactive'].includes(d.status):d.status===q.filter)).map(([p,data])=>({id:p.slice(6),data})).sort((a,b)=>b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id));if(q.cursor)rows=rows.filter(r=>r.data.createdAt.toISOString()<q.cursor.time||r.data.createdAt.toISOString()===q.cursor.time&&r.id<q.cursor.id);return structuredClone(rows.slice(0,q.limit))},
  query:async()=>[],countGameShorts:async()=>0,
  transact(work){const next=tail.then(async()=>{const writes=new Map();const value=await work({get:async p=>{assert.equal(writes.size,0);return get(p)},set:(p,d)=>writes.set(p,d),create:(p,d)=>{assert.ok(!docs.has(p));writes.set(p,d)}});for(const [p,d]of writes)docs.set(p,d);return value});tail=next.catch(()=>{});return next}}
 return {docs,store,now,queries}
}
const change=(deps,id,action,revision=0,extra={})=>moderateCatalogGame({id,action,reason:'Decisão administrativa documentada',revision,confirmed:true,...extra},'owner',deps)
const logs=deps=>[...deps.docs].filter(([p,d])=>p.startsWith('moderationLogs/')&&d.actorUid==='owner')
test('catálogo consulta até 21, devolve 20 cronológicos e vincula cursor ao filtro',async()=>{
 const deps=memory();for(let n=0;n<43;n++)deps.docs.set('games/g'+String(n).padStart(2,'0'),{officialName:'Jogo '+n,status:'active',source:'IGDB',createdAt:now()})
 const first=await loadGameCatalog({filter:'all'},deps.store),second=await loadGameCatalog({filter:'all',cursor:first.next},deps.store),third=await loadGameCatalog({filter:'all',cursor:second.next},deps.store)
 assert.deepEqual([first.items.length,second.items.length,third.items.length],[20,20,3]);assert.equal(third.next,null);assert.equal(first.items[0].id,'g42');assert.equal(new Set([...first.items,...second.items,...third.items].map(r=>r.id)).size,43);assert.ok(deps.queries.every(q=>q.limit===21))
 await assert.rejects(loadGameCatalog({filter:'banned',cursor:first.next},deps.store),/invalid-input/)
 for(const input of [{filter:'secret'},{filter:'all',cursor:{id:'../bad',time:now().toISOString(),scope:'all'}},{filter:'all',extra:true}])await assert.rejects(loadGameCatalog(input,deps.store),/invalid-input/)
})
test('aprovação de provisório preserva identidade/metadados e grava somente decisão e reservas',async()=>{
 const deps=memory(),result=await createManualGame({name:'Jogo da Comunidade'},visitor,deps),id=result.game.id,before=structuredClone(deps.docs.get('games/'+id))
 await change(deps,id,'approve');const game=deps.docs.get('games/'+id)
 assert.equal(game.status,'active');assert.equal(game.reviewStatus,'reviewed');assert.deepEqual({...game,reviewStatus:before.reviewStatus,reviewVersion:undefined},{...before,reviewVersion:undefined});assert.equal(logs(deps).length,1);assert.equal(logs(deps)[0][1].actorUid,'owner');assert.equal(game.actorUid,undefined);assert.equal(game.reason,undefined)
})
test('banir oculto, desbanir e restaurar preserva vídeos removidos e cota/identidade',async()=>{
 const deps=memory(),{game:{id}}=await createManualGame({name:'Jogo Autoral'},visitor,deps)
 deps.docs.set('shorts/existing',{gameId:id,moderationStatus:'removed'});deps.docs.set('videoIdentities/existing',{blocked:true});const before=structuredClone([...deps.docs].filter(([p])=>!p.startsWith('games/')&&!p.startsWith('moderationLogs/')&&!p.startsWith('gameNameKeys/')))
 await change(deps,id,'hide');await change(deps,id,'ban',1)
 assert.equal((await loadCatalogGame({id},deps.store)).unbanTarget,'hidden');await assert.rejects(createManualGame({name:'JÓGO AUTORAL'},visitor,deps),/game-unavailable/)
 await change(deps,id,'unban',2);assert.equal(deps.docs.get('games/'+id).status,'hidden');await change(deps,id,'restore',3);assert.equal(deps.docs.get('games/'+id).status,'active');assert.equal(deps.docs.get('games/'+id).reviewStatus,'provisional');assert.equal(logs(deps).length,4)
 for(const [p,d]of before)assert.deepEqual(deps.docs.get(p),d)
})
test('decisões concorrentes aceitam uma revisão, sem auditoria parcial',async()=>{
 const deps=memory(),{game:{id}}=await createManualGame({name:'Jogo Solar'},visitor,deps)
 const results=await Promise.allSettled([change(deps,id,'hide'),change(deps,id,'ban')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/stale-review/);assert.equal(logs(deps).length,1)
})
test('confirmação explícita, motivo, revisão, IDs e transições inválidas nunca gravam',async()=>{
 const deps=memory(),{game:{id}}=await createManualGame({name:'Jogo Lunar'},visitor,deps),size=deps.docs.size
 for(const patch of [{confirmed:false},{reason:'curto'.repeat(101)},{reason:'x'},{reason:'linha\nquebra'},{reason:'texto\u200binvisível'},{revision:-1},{revision:Number.MAX_SAFE_INTEGER},{id:'../bad'},{extra:true}])await assert.rejects(change(deps,id,'hide',0,patch),/invalid-input/)
 await assert.rejects(change(deps,id,'restore'),/game-action-unavailable/);await assert.rejects(change(deps,id,'ban',1),/stale-review/);assert.equal(deps.docs.size,size)
 deps.docs.set('games/'+id,{...deps.docs.get('games/'+id),status:'banned'});await assert.rejects(change(deps,id,'unban'),/game-action-unavailable/);assert.equal((await loadCatalogGame({id},deps.store)).unbanTarget,null)
})
test('detalhe distingue contagem zero de indisponível e remove dados privados de histórico',async()=>{
 const deps=memory(),{game:{id}}=await createManualGame({name:'Jogo Estelar'},visitor,deps)
 deps.store.query=async()=>Array.from({length:21},(_,n)=>({id:'log'+n,data:{contentType:'game',action:'ban',actorUid:'owner',reason:'Motivo confirmado',visitorHash:'segredo',token:'segredo',createdAt:now()}}))
 const detail=await loadCatalogGame({id},deps.store);assert.equal(detail.shortCount,0);assert.equal(detail.history.length,20);assert.equal(detail.historyLimited,true);assert.ok(!JSON.stringify(detail).includes('segredo'))
 deps.store.countGameShorts=async()=>{throw Error('private key')};assert.equal((await loadCatalogGame({id},deps.store)).shortCount,null)
})
test('registro de nomes em preparação e referências corrompidas fecham a decisão sem escrita',async()=>{
 const deps=memory(),{game:{id}}=await createManualGame({name:'Jogo Verde'},visitor,deps)
 deps.docs.set(nameStatePath,{version:1,ready:false});await assert.rejects(change(deps,id,'ban'),/game-names-preparing/);assert.equal(logs(deps).length,0)
 deps.docs.set(nameStatePath,{version:1,ready:true});const key=[...deps.docs.keys()].find(p=>p.startsWith('gameNameKeys/'));deps.docs.set(key,{version:1,gameIds:['orphan']});await assert.rejects(change(deps,id,'hide'),/invalid-name-reference/);assert.equal(logs(deps).length,0)
})
test('todos os endpoints exigem autorização UID/TOTP antes de ler catálogo ou receber decisão',async()=>{
 const deps=memory(),base={...deps,origin,checkAbuse:async()=>true,verify:async()=>{throw Error('unused')}}
 for(const path of ['catalog','detail','moderate','edit'])for(const [code,status]of [['invalid-token',401],['admin-forbidden',403],['totp-required',403]]){
  let touched=false;const store={transact:async()=>{touched=true;throw Error('must not read')},gameCatalogPage:async()=>{touched=true;throw Error('must not read')}}
  const response=await handleAdminModeration(new Request(origin+'/api/admin/games/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({filter:'all'})}),{...base,store,admin:{authorize:async()=>{throw new AdminAuthError(code,status)}}})
  assert.equal(response.status,status);assert.equal(touched,false);assert.equal(response.headers.get('cache-control'),'no-store')
 }
})
test('roteador público reconhece novas rotas e recusa visitante sem cookie assinado',async()=>{
 const deps=memory(),api=await createPublicApi({...deps,origin,visitorSecret:'a'.repeat(64),maximumAttempts:20,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('unused')},admin:{authorize:async()=>{throw Error('must not authorize')}}})
 for(const path of ['catalog','detail','moderate','edit'])assert.equal((await api(new Request(origin+'/api/admin/games/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}))).status,429)
})
test('HTTP autorizado mantém origem, limite, tipo e tamanho de corpo; erros são redigidos',async()=>{
 const deps=memory(),options={...deps,origin,checkAbuse:async()=>true,verify:async()=>{},admin:{authorize:async()=>({uid:'owner'})}}
 const req=(body,headers={},method='POST')=>new Request(origin+'/api/admin/games/catalog',{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(method==='POST'?{body}: {})})
 assert.equal((await handleAdminModeration(req('{"filter":"all"}'),options)).status,200)
 assert.equal((await handleAdminModeration(req('{}',{Origin:'https://evil.test'}),options)).status,403)
 assert.equal((await handleAdminModeration(req('{}',{'Content-Type':'text/plain'}),options)).status,415)
 assert.equal((await handleAdminModeration(req('{}',{},'GET'),options)).status,405)
 assert.equal((await handleAdminModeration(req('{}'),{...options,checkAbuse:async()=>false})).status,429)
 assert.equal((await handleAdminModeration(req(JSON.stringify({filter:'all',extra:'x'.repeat(9000)})),options)).status,413)
 const failure=await handleAdminModeration(req('{}'),{...options,admin:{authorize:async()=>{throw Error('secret token')}}});assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('secret'))
})
