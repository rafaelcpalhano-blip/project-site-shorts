import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizedGameName} from '../src/lib/validation/game-name.ts'
import {createManualGame} from '../server/games/manual-game.ts'
import {nameIdentity,nameStatePath} from '../server/games/name-keys.ts'
import {diagnoseGameNames,prepareGameNames} from '../server/games/prepare-name-keys.ts'
import {confirmGame} from '../server/games/confirm-game.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {createGameCatalogClient} from '../src/features/games/services/catalog-api.ts'
const visitor='a'.repeat(64),other='b'.repeat(64),now=()=>new Date('2026-10-21T12:00:00Z')
function memory(ready=true){const docs=new Map(ready?[[nameStatePath,{version:1,ready:true}]]:[]);let tail=Promise.resolve();const stats={maximumPage:0}
 const store={async scanGames(after){const rows=[...docs].filter(([p])=>p.startsWith('games/')&&(!after||p.slice(6)>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([p,data])=>({id:p.slice(6),data:structuredClone(data)}));stats.maximumPage=Math.max(stats.maximumPage,rows.length);return rows},transact(work){const next=tail.then(async()=>{const writes=new Map();const result=await work({get:async p=>{assert.equal(writes.size,0,'reads precede writes');return structuredClone(docs.get(p)??null)},create:(p,d)=>{assert.ok(!docs.has(p));writes.set(p,d)},set:(p,d)=>writes.set(p,d)});for(const [p,d]of writes)docs.set(p,d);return result});tail=next.catch(()=>{});return next}}
 return {store,docs,stats,now}
}
const create=(deps,name,who=visitor)=>createManualGame({name},who,deps)
const official=(id,name)=>({externalId:id,officialName:name,description:'',aliases:[],genres:[],gameModes:[],platforms:[],releaseDate:null,imageUrl:null,sourceUrl:null})
test('nomes normalizam acentos/caixa/compatibilidade, detectam variantes e rejeitam invisíveis/nomes vazios',async()=>{
 assert.equal(normalizedGameName('  TÍBIA  ').normalizedName,'tibia')
 const a=await nameIdentity('Tibia'),b=await nameIdentity('Ｔｉｂｉａ'),c=await nameIdentity('Tіbia'),d=await nameIdentity('T i b i a!')
 assert.equal(a.exact,b.exact);assert.equal(a.similar,c.similar);assert.equal(a.similar,d.similar)
 for(const value of ['', '---','x'.repeat(501),'Ti\u200bbia'])assert.throws(()=>normalizedGameName(value))
})
test('concorrência/repetição cria um jogo provisório, reserva e cota uma única vez, inclusive entre visitantes',async()=>{
 const deps=memory(),results=await Promise.all([create(deps,'Jogo do Bairro'),create(deps,'JÓGO DO BAIRRO'),create(deps,'Jogo do Bairro',other)])
 assert.equal(new Set(results.map(r=>r.game.id)).size,1);assert.equal(results.filter(r=>r.created).length,1)
 const game=deps.docs.get('games/'+results[0].game.id);assert.equal(game.reviewStatus,'provisional');assert.equal(game.status,'active');assert.equal(game.source,'manual');assert.equal(game.description,'');assert.equal(game.imageUrl,null)
 assert.equal(deps.docs.get('gameCreationLimits/'+visitor+'-2026-10-21').count,1);assert.equal(deps.docs.has('gameCreationLimits/'+other+'-2026-10-21'),false)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('moderationLogs/')).length,1)
})
test('três criações diárias, reuso/recusas sem consumo e dia São Paulo independente de shorts',async()=>{
 const deps=memory();for(const name of ['Jogo Solar','Jogo Lunar','Jogo Estelar'])await create(deps,name)
 await assert.rejects(create(deps,'Jogo Celeste'),/game-daily-limit/)
 assert.equal((await create(deps,'JOGO SOLAR')).created,false)
 for(const name of ['', 'x'.repeat(101),'merda'])await assert.rejects(create(deps,name))
 assert.equal(deps.docs.get('gameCreationLimits/'+visitor+'-2026-10-21').count,3)
 assert.ok(![...deps.docs.keys()].some(p=>p.startsWith('submissionLimits/')))
 const midnight=memory();midnight.now=()=>new Date('2026-10-21T02:59:59Z');for(const name of ['Jogo Amanhã','Jogo Hoje','Jogo Ontem'])await create(midnight,name)
 midnight.now=()=>new Date('2026-10-21T03:00:00Z');assert.equal((await create(midnight,'Jogo Novo Dia')).created,true)
 assert.equal(midnight.docs.get('gameCreationLimits/'+visitor+'-2026-10-20').count,3);assert.equal(midnight.docs.get('gameCreationLimits/'+visitor+'-2026-10-21').count,1)
})
test('nomes semelhantes não são mesclados e nomes banidos não são recriados por outra rota',async()=>{
 const deps=memory(),first=await create(deps,'Tibia')
 await assert.rejects(create(deps,'Tіbia'),/game-name-conflict/)
 await assert.rejects(create(deps,'T i b i a!'),/game-name-conflict/)
 deps.docs.get('games/'+first.game.id).status='banned'
 for(const name of ['Tíbia','Tіbia','T I B I A!','T1bia'])await assert.rejects(create(deps,name),/game-unavailable/)
 await assert.rejects(confirmGame({externalId:'77'},{...deps,get:async()=>official('77','Tibia')}),/game-unavailable/)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('games/')).length,1)
})
test('IDs oficiais distintos são preservados; inclusão manual ambígua não escolhe um deles',async()=>{
 const deps=memory();await confirmGame({externalId:'1'},{...deps,get:async()=>official('1','Doom')});await confirmGame({externalId:'2'},{...deps,get:async()=>official('2','DOOM')})
 assert.ok(deps.docs.has('games/igdb-1'));assert.ok(deps.docs.has('games/igdb-2'));await assert.rejects(create(deps,'Doom'),/game-name-conflict/)
})
test('preparação paginada preserva dados/IDs e torna cadastro pronto sem converter rejeições antigas',async()=>{
 const deps=memory(false);for(let n=0;n<35;n++)deps.docs.set('games/g'+String(n).padStart(2,'0'),{officialName:'Jogo Antigo '+n,status:n===0?'disabled':'active',source:'manual',extra:'preservado'})
 deps.docs.set('gameRequests/old',{status:'rejected',name:'Outro jogo'})
 await assert.rejects(create(deps,'Jogo Novo'),/game-names-preparing/)
 const before=structuredClone([...deps.docs.entries()].filter(([p])=>p.startsWith('games/')))
 const diagnosis=await diagnoseGameNames(deps.store);assert.equal(diagnosis.rows.length,35);assert.equal(diagnosis.collisions.length,0);assert.ok(deps.stats.maximumPage<=30)
 await prepareGameNames(deps.store,now);assert.deepEqual([...deps.docs.entries()].filter(([p])=>p.startsWith('games/')),before)
 assert.equal(deps.docs.get('gameRequests/old').status,'rejected');await assert.rejects(create(deps,'Jogo Antigo 0'),/game-unavailable/)
 assert.equal((await create(deps,'Jogo Antigo 1')).game.id,'g01');assert.equal(deps.docs.has('gameCreationLimits/'+visitor+'-2026-10-21'),false)
 await prepareGameNames(deps.store,now);assert.equal(deps.docs.get(nameStatePath).ready,true)
})
test('colisões impedem preparação sem alterar registros; falha parcial bloqueia e permite retomada idempotente',async()=>{
 const collision=memory(false);collision.docs.set('games/a',{officialName:'A-B',status:'active'});collision.docs.set('games/b',{officialName:'AB',status:'active'})
 assert.equal((await diagnoseGameNames(collision.store)).collisions.length,1);await assert.rejects(prepareGameNames(collision.store,now),/name-collisions/);assert.equal(collision.docs.size,2)
 const deps=memory(false);deps.docs.set('games/a',{officialName:'Jogo Primeiro',status:'active'});deps.docs.set('games/b',{officialName:'Jogo Segundo',status:'active'})
 let writes=0;const base=deps.store.transact;const broken={...deps.store,transact:work=>base(async tx=>{const result=await work(tx);if(++writes===3)throw Error('interrupted');return result})}
 await assert.rejects(prepareGameNames(broken,now),/interrupted/);assert.equal(deps.docs.get(nameStatePath).ready,false);await assert.rejects(create(deps,'Jogo Terceiro'),/game-names-preparing/)
 await assert.rejects(prepareGameNames(deps.store,now),/preparation-busy/)
 await prepareGameNames(deps.store,()=>new Date(now().getTime()+180000));assert.equal(deps.docs.get(nameStatePath).ready,true)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('gameNameKeys/')).length,4)
})
test('endpoint manual mantém sessão, origem, corpo limitado e proteção dos campos administrativos',async()=>{
 const deps=memory(),origin='https://clipzone.test';const api=await createPublicApi({origin,store:deps.store,now,visitorSecret:'ab'.repeat(32),maximumAttempts:20,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}})
 const req=(body,headers={},method='POST')=>new Request(origin+'/api/games/manual',{method,headers:{origin,'content-type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})})
 assert.equal((await api(req({name:'Jogo Livre'}))).status,401);assert.equal((await api(req({}, {},'GET'))).status,405);assert.equal((await api(req({}, {origin:'https://evil.test'}))).status,403)
 const session=await api(new Request(origin+'/api/session',{method:'POST',headers:{origin}})),cookie=session.headers.get('set-cookie').split(';')[0]
 assert.equal((await api(req({name:'Jogo Livre',status:'active'},{cookie}))).status,400)
 assert.equal((await api(req({name:'x'.repeat(9000)},{cookie}))).status,413)
 const response=await api(req({name:'Jogo Livre'},{cookie}));assert.equal(response.status,201);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.equal((await api(req({name:'Jogo Livre'},{cookie}))).status,200)
 assert.ok([...deps.docs.keys()].some(p=>p.startsWith('gameRequestAttempts/')));assert.ok(![...deps.docs.keys()].some(p=>p.startsWith('submissionLimits/')))
})
test('cliente usa rota separada, envia só nome, trata limites e preserva a API antiga',async()=>{
 const calls=[],client=createGameCatalogClient(async(path,options)=>{calls.push({path,options});return path==='/api/session'?new Response(null,{status:204}):Response.json({created:true,game:{id:'manual-'+'a'.repeat(64),name:'Jogo Livre'}})})
 assert.equal((await client.includeManual('Jogo Livre')).created,true);assert.equal(calls[1].path,'/api/games/manual');assert.deepEqual(JSON.parse(calls[1].options.body),{name:'Jogo Livre'});assert.equal(typeof client.request,'function')
 const failed=createGameCatalogClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({error:'game-daily-limit'},{status:429}));await assert.rejects(failed.includeManual('Jogo Livre'),/três jogos/)
})

test('reserva órfã não libera recriação automática pela rota manual nem oficial',async()=>{
 const deps=memory();await confirmGame({externalId:'1'},{...deps,get:async()=>official('1','Jogo Reservado')})
 deps.docs.delete('games/igdb-1')
 await assert.rejects(create(deps,'Jogo Reservado'),/game-unavailable/)
 await assert.rejects(confirmGame({externalId:'1'},{...deps,get:async()=>official('1','Jogo Reservado')}),/game-unavailable/)
 assert.equal(deps.docs.has('games/igdb-1'),false)
})

test('referência ou cota corrompida falha fechada sem reutilizar jogo errado nem criar registro parcial',async()=>{
 const deps=memory(),first=await create(deps,'Jogo Solar'),second=await create(deps,'Jogo Lunar'),identity=await nameIdentity('Jogo Solar')
 deps.docs.get('gameNameKeys/'+identity.exact).gameIds=[second.game.id]
 await assert.rejects(create(deps,'Jogo Solar'),/invalid-name-reference/)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('games/')).length,2)
 deps.docs.get('gameNameKeys/'+identity.exact).gameIds=[first.game.id]
 deps.docs.get('gameCreationLimits/'+visitor+'-2026-10-21').count=-1
 await assert.rejects(create(deps,'Jogo Estelar'),/invalid-game-quota/)
 assert.equal([...deps.docs.keys()].filter(p=>p.startsWith('games/')).length,2)
})
