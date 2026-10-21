import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,collection,getDocs} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {shortLike,likePath} from '../../server/likes/short-likes.ts'
import {cleanupLikes} from '../../server/likes/retention.ts'
import {readFeed,readPublicShort} from '../../server/public/read-content.ts'
import {createPublicReadClient} from '../../src/lib/firebase/public-read-api.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createLikesClient} from '../../src/features/likes/services/likes-api.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests',visitor='a'.repeat(64),other='b'.repeat(64),origin='https://clipzone.test',now=()=>new Date('2026-10-21T12:00:00Z'),store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>{await env?.cleanup()})
async function seed(){await env.clearFirestore();await store.transact(async tx=>{tx.set('games/game',{officialName:'Jogo',source:'manual',status:'active',createdAt:now()});tx.set('shorts/s1',{gameId:'game',title:'Jogada original',platform:'Twitch',platformVideoId:'LikeClipPublic',normalizedUrl:'https://clips.twitch.tv/LikeClipPublic',channelName:'Canal',moderationStatus:'published',reviewVersion:7,createdAt:now()})});return env.unauthenticatedContext().firestore()}
const set=(liked,revision=0,who=visitor)=>shortLike({shortId:'s1',liked,revision},who,options,true)
const state=()=>shortLike({shortId:'s1'},visitor,options)
test('REST concorrente duplica pedidos sem duplicar curtidas; identidades diferentes somam separadamente',async()=>{
 await seed();const results=await Promise.all([set(true),set(true),set(true,0,other)]);assert.equal(new Set(results.map(r=>r.shortId)).size,1);assert.equal((await state()).count,2);assert.equal((await state()).revision,1)
 const before=await store.get('shorts/s1');await set(true);assert.deepEqual(await store.get('shorts/s1'),before);assert.equal(before.reviewVersion,7);assert.equal(before.title,'Jogada original');assert.deepEqual(before.createdAt,now())
 await set(false,1);assert.equal((await state()).count,1);await assert.rejects(set(true,0),/stale-like/);assert.equal((await state()).count,1)
})
test('novo adaptador REST projeta contador no feed/detalhe, legados em zero e campos privados ausentes',async()=>{
 await seed();assert.equal((await readFeed({},store)).items[0].likeCount,0);await set(true);assert.equal((await readFeed({},store)).items[0].likeCount,1);assert.equal((await readPublicShort({shortId:'s1'},store)).likeCount,1)
 const feed=await readFeed({},store);assert.ok(!JSON.stringify(feed).includes(visitor));assert.equal(feed.items[0].revision,undefined);assert.equal(feed.items[0].liked,undefined)
})
test('SDK anônimo e alegação admin não alteram contador nem leem registros privados',async()=>{
 const db=await seed();await set(true);const path=await likePath('s1',visitor)
 for(const candidate of [db,env.authenticatedContext('owner',{admin:true}).firestore()]){
  for(const p of [path,'likeAttempts/'+visitor]){await assertFails(getDoc(doc(candidate,p)));await assertFails(setDoc(doc(candidate,p),{liked:true,count:999}))}
  await assertFails(setDoc(doc(candidate,'shorts','s1'),{likeCount:999}));await assertFails(getDocs(collection(candidate,'shortLikes')))
 }
 assert.equal((await state()).count,1)
})
test('moderação de jogo e short impede estado/interação; restauração conserva contagem sem reviver removidos',async()=>{
 await seed();await set(true)
 for(const status of ['hidden','banned']){
  await store.transact(async tx=>{const game=await tx.get('games/game');tx.set('games/game',{...game,status})});await assert.rejects(state(),/short-unavailable/);await assert.rejects(set(false,1),/short-unavailable/);assert.equal((await readFeed({},store)).items.length,0)
 }
 await store.transact(async tx=>{const game=await tx.get('games/game');tx.set('games/game',{...game,status:'active'})});assert.equal((await state()).count,1)
 await store.transact(async tx=>{const short=await tx.get('shorts/s1');tx.set('shorts/s1',{...short,moderationStatus:'removed'})});await assert.rejects(set(false,1),/short-unavailable/);assert.equal((await store.get('shorts/s1')).likeCount,1);assert.equal((await readFeed({},store)).items.length,0)
})
test('integração HTTP/cliente persiste escolha, atualiza contador e separa limite de publicações',async()=>{
 await seed();const api=await createPublicApi({...options,origin,visitorSecret:'cd'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}});let cookie=''
 const fetcher=async(path,opts)=>{const response=await api(new Request(origin+path,{...opts,headers:{...opts.headers,Origin:origin,Cookie:cookie}}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response}
 const likes=createLikesClient(fetcher),reads=createPublicReadClient(fetcher),initial=await likes.state('s1'),liked=await likes.set(initial,true);assert.equal((await reads.listShorts()).items[0].likeCount,1);assert.equal((await likes.state('s1')).liked,true);await likes.set(liked,false);assert.equal((await reads.getShort('s1')).likeCount,0)
 await env.withSecurityRulesDisabled(async c=>{assert.equal((await getDocs(collection(c.firestore(),'submissionLimits'))).size,0);assert.equal((await getDocs(collection(c.firestore(),'likeAttempts'))).size,1)})
})
test('limpeza REST confirma 90 dias, transação e deleção sem mudar contadores ativos',async()=>{
 await seed();const old=new Date(now().getTime()-91*86400000),inactive=await likePath('s1',visitor),active=await likePath('s1',other)
 await store.transact(async tx=>{tx.set(inactive,{shortId:'s1',liked:false,revision:2,createdAt:old,changedAt:old});tx.set(active,{shortId:'s1',liked:true,revision:1,createdAt:old,changedAt:old});tx.set('shorts/s1',{gameId:'game',moderationStatus:'published',likeCount:1});tx.set('likeAttempts/'+visitor,{count:20,startsAt:old,updatedAt:old})})
 const inspection=await cleanupLikes({...options,collection:'shortLikes'});assert.equal(inspection.eligible,1);assert.ok(await store.get(inactive));assert.equal((await cleanupLikes({...options,collection:'shortLikes',apply:true})).deleted,1);assert.equal(await store.get(inactive),null);assert.equal((await store.get(active)).liked,true);assert.equal((await store.get('shorts/s1')).likeCount,1)
 assert.equal((await cleanupLikes({...options,collection:'likeAttempts',apply:true})).deleted,1);assert.equal(await store.get('likeAttempts/'+visitor),null)
})
test('cinco publicações e duplicatas preservadas após curtir/descurtir',async()=>{
 await seed();const deps={...options,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})},input=n=>({url:'https://clips.twitch.tv/LikeQuotaClip'+n,title:'Jogada da comunidade '+n,gameId:'game'})
 for(let n=0;n<5;n++)await submitShort(input(n),visitor,deps)
 await set(true);await set(false,1);assert.equal((await store.get('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video')
})
