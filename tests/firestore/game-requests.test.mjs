import {submitShort} from '../../server/submissions/submit-short.ts'
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,collection,getDocs,query,where,limit} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {requestGame,reviewGameRequest,loadGameRequests} from '../../server/games/requests.ts'
import {confirmGame} from '../../server/games/confirm-game.ts'
import {createPublicRepository} from '../../src/lib/firebase/public-repository.ts'
const projectId='demo-clipzone-tests',visitor='b'.repeat(64),now=()=>new Date('2026-10-21T15:00:00Z')
const store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
const official={externalId:'1',officialName:'Portal',description:'Puzzle de portais',aliases:['Portal game'],genres:['Puzzle'],gameModes:['Single player'],platforms:['PC'],releaseDate:'2007-10-10',imageUrl:'https://images.igdb.com/igdb/image/upload/t_thumb/a.jpg',sourceUrl:'https://www.igdb.com/games/portal'}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
async function seed(){await env.clearFirestore();return env.unauthenticatedContext().firestore()}
const read=path=>store.transact(tx=>tx.get(path))

test('REST cria uma solicitação nas tentativas concorrentes, protegendo identidade e escritas do cliente',async()=>{
 const db=await seed(),results=await Promise.all([requestGame({name:'Portal'},visitor,options),requestGame({name:'PORTAL'},visitor,options),requestGame({name:'Pórtal'},visitor,options)])
 assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(results.filter(r=>r.repeated).length,2)
 const id=results[0].id
 await assertFails(getDoc(doc(db,'gameRequests',id)));await assertFails(getDocs(query(collection(db,'gameRequests'),where('status','==','pending'),limit(21))))
 await assertFails(getDoc(doc(db,'gameRequestAttempts',visitor)))
 await assertFails(setDoc(doc(db,'gameRequests',id),{status:'linked'}))
 await assertFails(setDoc(doc(env.authenticatedContext('owner',{admin:true}).firestore(),'gameRequests',id),{status:'linked'}))
 assert.equal((await loadGameRequests({status:'pending'},store)).items.length,1)
 assert.equal(await read('submissionLimits/'+visitor+'-2026-10-21'),null)
})
test('confirmação IGDB persiste a ficha pública e revisão concorrente vincula uma vez sem publicar vídeo',async()=>{
 const db=await seed(),{id}=await requestGame({name:'Portal'},visitor,options)
 await confirmGame({externalId:'1'},{...options,get:async()=>official})
 const game=await createPublicRepository(db).getGame('igdb-1')
 assert.equal(game.description,official.description);assert.deepEqual(game.aliases,official.aliases);assert.equal(game.sourceUrl,official.sourceUrl)
 const input={id,action:'link',gameId:'igdb-1',reason:'Correspondência IGDB conferida',revision:0}
 const result=await Promise.allSettled([reviewGameRequest(input,'owner',options),reviewGameRequest(input,'owner',options)])
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1)
 const detail=await requestGame({name:'Portal'},visitor,options)
 assert.deepEqual(detail.game,{id:'igdb-1',name:'Portal'})
 const logs=await store.query({collection:'moderationLogs',filter:{field:'contentId',value:id},orderBy:'createdAt',limit:10})
 assert.equal(logs.length,1);assert.equal(logs[0].data.actorUid,'owner')
 await assertFails(getDoc(doc(db,'moderationLogs',logs[0].id)))
 const rows=await fetch('http://127.0.0.1:8081/v1/projects/'+projectId+'/databases/(default)/documents/shorts').then(r=>r.json())
 assert.equal(rows.documents?.length??0,0)
})
test('jogo desativado não é vinculado e falhas preservam solicitação sem histórico parcial',async()=>{
 const db=await seed(),{id}=await requestGame({name:'Portal'},visitor,options)
 await store.transact(async tx=>tx.set('games/igdb-1',{...official,source:'IGDB',status:'disabled'}))
 await assert.rejects(reviewGameRequest({id,action:'link',gameId:'igdb-1',reason:'Conferência do jogo',revision:0},'owner',options),/invalid-game/)
 assert.equal((await read('gameRequests/'+id)).status,'pending')
 assert.equal((await store.query({collection:'moderationLogs',filter:{field:'contentId',value:id},orderBy:'createdAt',limit:10})).length,0)
 await assertFails(getDoc(doc(db,'games','igdb-1')))
 await reviewGameRequest({id,action:'reject',reason:'Jogo não disponível no catálogo',revision:0},'owner',options)
 assert.equal((await requestGame({name:'Portal'},visitor,options)).status,'rejected')
})
test('fila REST pagina datas iguais sem repetição e sem vazar autor; cursor inválido é rejeitado',async()=>{
 await seed()
 await store.transact(async tx=>{for(let i=0;i<23;i++)tx.set('gameRequests/'+i.toString(16).padStart(64,'0'),{name:'Jogo '+i,normalizedName:'jogo '+i,visitorHash:visitor,status:'pending',revision:0,createdAt:now()})})
 const first=await loadGameRequests({status:'pending'},store),second=await loadGameRequests({status:'pending',cursor:first.next},store)
 assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,23)
 assert.ok(!JSON.stringify(first).includes(visitor))
 await assert.rejects(loadGameRequests({status:'pending',cursor:{id:'../private',time:now().toISOString()}},store),/invalid-input/)
})

test('REST aprova manualmente de forma concorrente, gera uma ficha pública e preserva cota/deduplicação de vídeos',async()=>{
 const db=await seed(),first=await requestGame({name:'Meu jogo'},visitor,options),second=await requestGame({name:'Pedido 2'},visitor,options)
 const input=id=>({id,action:'create',name:'Meu jogo',reason:'Cadastro manual autorizado',revision:0})
 const outcomes=await Promise.allSettled([reviewGameRequest(input(first.id),'owner',options),reviewGameRequest(input(first.id),'owner',options),reviewGameRequest(input(second.id),'owner',options)])
 assert.equal(outcomes.filter(v=>v.status==='fulfilled').length,2)
 const gameId=(await read('gameRequests/'+first.id)).gameId;assert.equal((await read('gameRequests/'+second.id)).gameId,gameId)
 const game=await createPublicRepository(db).getGame(gameId);assert.equal(game.source,'manual');assert.equal(game.description,'');assert.equal(game.imageUrl,null)
 assert.ok((await createPublicRepository(db).listGames()).items.some(item=>item.id===gameId))
 await assertFails(setDoc(doc(db,'games',gameId),{status:'active',source:'IGDB'}))
 assert.equal(await read('submissionLimits/'+visitor+'-2026-10-21'),null)
 const deps={...options,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[],title:'Jogada válida'})}
 const video={url:'https://clips.twitch.tv/ManualGameTest',gameId,channelName:'Canal'}
 const published=await submitShort(video,visitor,deps);assert.equal(published.status,'published')
 await assert.rejects(submitShort(video,visitor,deps),/duplicate-video/)
 assert.equal((await read('submissionLimits/'+visitor+'-2026-10-21')).count,1)
})
test('REST decisão manual obsoleta não cria jogo órfão',async()=>{
 await seed();const first=await requestGame({name:'Meu jogo'},visitor,options)
 await reviewGameRequest({id:first.id,action:'reject',reason:'Pedido de teste rejeitado',revision:0},'owner',options)
 await assert.rejects(reviewGameRequest({id:first.id,action:'create',name:'Meu jogo',reason:'Teste de estado obsoleto',revision:0},'owner',options),/stale-review/)
 assert.equal((await fetch('http://127.0.0.1:8081/v1/projects/'+projectId+'/databases/(default)/documents/games').then(r=>r.json())).documents?.length??0,0)
})
