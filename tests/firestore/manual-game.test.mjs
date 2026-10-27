import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {doc,getDoc,getDocs,setDoc,collection} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createManualGame} from '../../server/games/manual-game.ts'
import {nameIdentity,nameStatePath} from '../../server/games/name-keys.ts'
import {prepareGameNames,diagnoseGameNames} from '../../server/games/prepare-name-keys.ts'
import {confirmGame} from '../../server/games/confirm-game.ts'
import {requestGame,reviewGameRequest} from '../../server/games/requests.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
import {readEmulatorPublicGame} from '../helpers/emulator-public-game.mjs'
const projectId='demo-clipzone-tests',visitor='a'.repeat(64),other='b'.repeat(64),now=()=>new Date('2026-10-21T12:00:00Z'),store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>{await env?.cleanup()})
async function seed(ready=true){await env.clearFirestore();if(ready)await store.transact(async tx=>tx.set(nameStatePath,{version:1,ready:true}));return env.unauthenticatedContext().firestore()}
const create=(name,who=visitor)=>createManualGame({name},who,options)
async function size(name){let count;await env.withSecurityRulesDisabled(async context=>{count=(await getDocs(collection(context.firestore(),name))).size});return count}
test('REST concorrente reserva um jogo e uma cota, inclusive entre visitantes, sem expor dados privados',async()=>{
 const db=await seed();const results=await Promise.all([create('Jogo do Bairro'),create('JÓGO DO BAIRRO'),create('Jogo do Bairro',other)])
 assert.equal(new Set(results.map(r=>r.game.id)).size,1);assert.equal(results.filter(r=>r.created).length,1);assert.equal(await size('games'),1);assert.equal(await size('gameNameKeys'),2);assert.equal(await size('gameCreationLimits'),1);assert.equal(await size('moderationLogs'),1)
 const game=await readEmulatorPublicGame(db,results[0].game.id,{store,now});assert.equal(game.provisional,true);assert.equal(game.description,'');assert.equal(game.imageUrl,null)
 const identity=await nameIdentity('Jogo do Bairro');for(const path of [nameStatePath,'gameNameKeys/'+identity.exact,'gameCreationLimits/'+visitor+'-2026-10-21']){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{ready:true,count:0}));await assertFails(setDoc(doc(env.authenticatedContext('owner',{admin:true}).firestore(),path),{ready:true,count:0}))}
 await assertSucceeds(getDoc(doc(db,'games',results[0].game.id)));await assertFails(setDoc(doc(db,'games',results[0].game.id),{status:'active'}))
})
test('quatro criações concorrentes aceitam só três e tentativas/reuso não geram cobrança extra ou reserva órfã',async()=>{
 await seed();const names=['Jogo Solar','Jogo Lunar','Jogo Estelar','Jogo Celeste'];const results=await Promise.allSettled(names.map(name=>create(name)))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.match(results.find(r=>r.status==='rejected').reason.message,/game-daily-limit/)
 assert.equal(await size('games'),3);assert.equal(await size('gameNameKeys'),6);assert.equal(await size('moderationLogs'),3)
 const accepted=results.find(r=>r.status==='fulfilled').value;assert.equal((await create(accepted.game.name)).created,false)
 assert.equal((await store.get('gameCreationLimits/'+visitor+'-2026-10-21')).count,3);assert.equal(await size('submissionLimits'),0)
 await assert.rejects(create('merda'),/game-name-not-allowed/);assert.equal((await store.get('gameCreationLimits/'+visitor+'-2026-10-21')).count,3)
})
test('preparação local mantém legados e rejeições; jogos não ativos têm nomes reservados e reuso não gasta cota',async()=>{
 const db=await seed(false);await store.transact(async tx=>{tx.set('games/legacy',{officialName:'Jogo Antigo',status:'active',source:'manual',extra:'preservado'});tx.set('games/blocked',{officialName:'Tibia',status:'disabled',source:'IGDB',extra:'preservado'});tx.set('gameRequests/old',{name:'Outro jogo',status:'rejected'})})
 await assert.rejects(create('Jogo Livre'),/game-names-preparing/);assert.equal((await diagnoseGameNames(store)).collisions.length,0)
 await prepareGameNames(store,now);assert.equal((await create('JÓGO ANTIGO')).game.id,'legacy');await assert.rejects(create('T1bia'),/game-unavailable/)
 assert.equal((await store.get('games/legacy')).extra,'preservado');assert.equal((await store.get('games/blocked')).status,'disabled');assert.equal((await store.get('gameRequests/old')).status,'rejected');assert.equal(await size('gameCreationLimits'),0)
 await prepareGameNames(store,now);assert.equal(await size('gameNameKeys'),4);await assertFails(getDoc(doc(db,'games','blocked')))
})
test('banimento impede recriação por variantes, confirmação IGDB e criação administrativa alternativa',async()=>{
 await seed();const result=await create('Tibia');await store.transact(async tx=>{const game=await tx.get('games/'+result.game.id);tx.set('games/'+result.game.id,{...game,status:'banned'})})
 for(const name of ['Tíbia','Tіbia','T i b i a!','T1bia'])await assert.rejects(create(name),/game-unavailable/)
 await assert.rejects(confirmGame({externalId:'77'},{store,now,get:async()=>({externalId:'77',officialName:'Tibia'})}),/game-unavailable/)
 const request=await requestGame({name:'T1bia'},visitor,options);await assert.rejects(reviewGameRequest({id:request.id,action:'create',name:'T1bia',reason:'Cadastro alternativo avaliado',revision:0},'owner',options),/game-unavailable/)
 assert.equal((await store.get('gameRequests/'+request.id)).status,'pending');assert.equal(await size('games'),1);assert.equal(await size('moderationLogs'),1)
})
test('jogo provisório permite publicação normal sem misturar cota de jogos com cinco shorts',async()=>{
 await seed();const game=await create('Jogo da Comunidade'),deps={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})}
 const input=n=>({url:'https://clips.twitch.tv/ManualPublicClip'+n,title:'Jogada da comunidade '+n,gameId:game.game.id})
 for(let n=0;n<5;n++)assert.equal((await submitShort(input(n),visitor,deps)).status,'published')
 await assert.rejects(submitShort(input(5),visitor,deps),error=>error.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),error=>error.code==='duplicate-video')
 assert.equal((await store.get('gameCreationLimits/'+visitor+'-2026-10-21')).count,1);assert.equal((await store.get('submissionLimits/'+visitor+'-2026-10-21')).count,5)
})
