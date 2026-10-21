import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,getDocs,collection} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {loadGameCatalog,loadCatalogGame,moderateCatalogGame} from '../../server/games/admin-catalog.ts'
import {createManualGame} from '../../server/games/manual-game.ts'
import {nameStatePath} from '../../server/games/name-keys.ts'
import {confirmGame} from '../../server/games/confirm-game.ts'
import {readFeed,readPublicShort,readComments} from '../../server/public/read-content.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests',visitor='a'.repeat(64),now=()=>new Date('2026-10-21T12:00:00Z'),store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>{await env?.cleanup()})
async function seed(){await env.clearFirestore();await store.transact(async tx=>tx.set(nameStatePath,{version:1,ready:true}));return env.unauthenticatedContext().firestore()}
const create=name=>createManualGame({name},visitor,options)
const change=(id,action,revision=0)=>moderateCatalogGame({id,action,reason:'Decisão administrativa confirmada',revision,confirmed:true},'owner',options)
async function size(name){let n;await env.withSecurityRulesDisabled(async c=>{n=(await getDocs(collection(c.firestore(),name))).size});return n}
const short=(id,gameId,status='published')=>({gameId,title:'Jogada '+id,platform:'Twitch',platformVideoId:'CatalogClip'+id,normalizedUrl:'https://clips.twitch.tv/CatalogClip'+id,channelName:'Canal',moderationStatus:status,createdAt:now()})
test('REST catálogo pagina 20/20/5, cronologia e empate por ID sem perder jogos',async()=>{
 await seed();await store.transact(async tx=>{for(let i=0;i<45;i++)tx.set('games/g'+String(i).padStart(2,'0'),{officialName:'Jogo '+i,status:'active',source:'IGDB',createdAt:new Date(now().getTime()+Math.floor(i/3)*1000)})})
 const first=await loadGameCatalog({filter:'all'},store),second=await loadGameCatalog({filter:'all',cursor:first.next},store),last=await loadGameCatalog({filter:'all',cursor:second.next},store)
 assert.deepEqual([first.items.length,second.items.length,last.items.length],[20,20,5]);assert.equal(first.items[0].id,'g44');assert.equal(last.next,null);assert.equal(new Set([...first.items,...second.items,...last.items].map(r=>r.id)).size,45)
 await assert.rejects(loadGameCatalog({filter:'hidden',cursor:first.next},store),/invalid-input/)
})
test('abas reais distinguem ativos/provisórios, ocultos legados e banidos',async()=>{
 await seed();const {game:{id}}=await create('Jogo Provisório');await store.transact(async tx=>{tx.set('games/old-hidden',{officialName:'Antigo',status:'disabled',source:'manual',createdAt:now()});tx.set('games/official',{officialName:'Oficial',status:'active',source:'IGDB',createdAt:now()})})
 assert.equal((await loadGameCatalog({filter:'active'},store)).items.length,2);assert.equal((await loadGameCatalog({filter:'provisional'},store)).items[0].id,id);assert.equal((await loadGameCatalog({filter:'hidden'},store)).items[0].id,'old-hidden')
 await change(id,'ban');assert.equal((await loadGameCatalog({filter:'banned'},store)).items[0].id,id);assert.equal((await loadGameCatalog({filter:'provisional'},store)).items.length,0)
})
test('ocultação bloqueia feed, ficha, detalhe e comentários; restauração mantém removidos e vínculos',async()=>{
 const db=await seed(),{game:{id}}=await create('Jogo Visível');await store.transact(async tx=>{tx.set('shorts/public',short('public',id));tx.set('shorts/removed',short('removed',id,'removed'));tx.set('comments/c1',{shortId:'public',moderationStatus:'approved',content:'Boa jogada',createdAt:now()});tx.set('videoIdentities/reserved',{blocked:true})})
 assert.equal((await readFeed({},store)).items.length,1);assert.equal((await readComments({shortId:'public'},store)).items.length,1);assert.equal((await loadCatalogGame({id},store)).shortCount,2)
 await change(id,'hide');assert.equal((await readFeed({},store)).items.length,0);await assert.rejects(readPublicShort({shortId:'public'},store),/short-unavailable/);await assert.rejects(readComments({shortId:'public'},store),/short-unavailable/);await assertFails(getDoc(doc(db,'games',id)))
 await change(id,'restore',1);assert.equal((await readFeed({},store)).items.length,1);assert.equal((await store.get('shorts/removed')).moderationStatus,'removed');assert.equal((await store.get('shorts/public')).gameId,id);assert.deepEqual(await store.get('videoIdentities/reserved'),{blocked:true});await assertSucceeds(getDoc(doc(db,'games',id)));assert.equal(await size('shorts'),2)
 for(const p of ['gameModerationStates/'+id,'shorts/public','comments/c1']){await assertFails(getDoc(doc(db,p)));await assertFails(setDoc(doc(db,p),{status:'active'}));await assertFails(setDoc(doc(env.authenticatedContext('owner',{admin:true}).firestore(),p),{status:'active'}))}
 const game=(await getDoc(doc(db,'games',id))).data();assert.equal(game.reason,undefined);assert.equal(game.actorUid,undefined)
})
test('banimento reserva nome e variantes, bloqueia via IGDB; desbanir mantém ocultação anterior',async()=>{
 await seed();const {game:{id}}=await create('Tibia');await change(id,'hide');await change(id,'ban',1)
 for(const name of ['Tíbia','T1bia','T i b i a!'])await assert.rejects(create(name),/game-unavailable/)
 await assert.rejects(confirmGame({externalId:'77'},{store,now,get:async()=>({externalId:'77',officialName:'Tibia'})}),/game-unavailable/)
 const detail=await loadCatalogGame({id},store);assert.equal(detail.unbanTarget,'hidden');assert.deepEqual(detail.actions,['unban']);assert.equal(detail.history.length,3);assert.equal(detail.history.filter(h=>h.actorUid==='owner').length,2)
 await change(id,'unban',2);assert.equal((await store.get('games/'+id)).status,'hidden');await change(id,'restore',3);assert.equal((await create('Tibia')).created,false);assert.equal(await size('gameNameKeys'),2);assert.equal(await size('games'),1);assert.equal((await store.get('gameCreationLimits/'+visitor+'-2026-10-21')).count,1)
})
test('transações concorrentes gravam só uma revisão e um evento administrativo',async()=>{
 await seed();const {game:{id}}=await create('Jogo Concorrente');const results=await Promise.allSettled([change(id,'hide'),change(id,'ban')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/stale-review/);assert.equal((await store.get('games/'+id)).reviewVersion,1);assert.equal(await size('moderationLogs'),2)
})
test('aprovação e banimento/restauração preservam cota de cinco e duplicatas',async()=>{
 await seed();const {game:{id}}=await create('Jogo de Teste'),deps={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})}
 const input=n=>({url:'https://clips.twitch.tv/CatalogQuotaClip'+n,title:'Jogada comunitária '+n,gameId:id})
 for(let n=0;n<5;n++)assert.equal((await submitShort(input(n),visitor,deps)).status,'published')
 await change(id,'approve');await change(id,'ban',1);await change(id,'unban',2)
 assert.equal((await store.get('games/'+id)).reviewStatus,'reviewed');assert.equal((await store.get('games/'+id)).status,'active');assert.equal((await store.get('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video');assert.equal((await loadCatalogGame({id},store)).shortCount,5)
})
test('agregação vazia retorna zero real e histórico/auditoria são inacessíveis por SDK',async()=>{
 const db=await seed(),{game:{id}}=await create('Jogo sem Shorts');assert.equal((await loadCatalogGame({id},store)).shortCount,0);await change(id,'ban')
 const detail=await loadCatalogGame({id},store);const event=detail.history.find(h=>h.actorUid==='owner');assert.ok(event);assert.ok(event.reason);assert.ok(event.createdAt);await assertFails(getDoc(doc(db,'moderationLogs',event.id)));await assertFails(getDocs(collection(db,'gameModerationStates')))
})
