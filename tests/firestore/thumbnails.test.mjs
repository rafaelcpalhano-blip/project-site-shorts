import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,updateDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
import {readFeed,readPublicShort} from '../../server/public/read-content.ts'
import {readOrderedFeed} from '../../server/ranking/read-feed.ts'
import {bootstrapRanking} from '../../server/ranking/bootstrap.ts'
import {buildRankingGeneration} from '../../server/ranking/generation.ts'
import {refreshThumbnails} from '../../server/videos/refresh-thumbnails.ts'
const store=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081}),visitor='a'.repeat(64),url='https://clips-media-assets2.twitch.tv/clip-preview-480x272.jpg',now=()=>new Date(),deps={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[],thumbnailUrl:url})};let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore();await store.transact(async tx=>tx.set('games/game',{officialName:'Jogo',status:'active',source:'manual',createdAt:new Date(Date.now()-86400000)}))});after(async()=>env?.cleanup())
const input=n=>({url:'https://clips.twitch.tv/ThumbnailClip'+n,title:'Jogada '+n,gameId:'game'})
test('miniatura persiste como timestamps e chega em feed/detalhe/quatro ordenações sem novos índices de consulta',async()=>{
 const r=await submitShort(input(0),visitor,deps),stored=await store.get('shorts/'+r.id);assert.equal(stored.thumbnail.url,url);assert.ok(stored.thumbnail.obtainedAt instanceof Date);assert.equal((await readFeed({},store)).items[0].thumbnail.url,url);assert.equal((await readPublicShort({shortId:r.id},store)).thumbnail.url,url)
 await bootstrapRanking({...deps,apply:true});await buildRankingGeneration(deps)
 for(const order of ['latest','oldest','likes','relevant'])assert.equal((await readOrderedFeed({order,gameId:'game'},deps)).items[0].thumbnail.url,url)
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('fake-owner',{admin:true}).firestore()])await assertFails(updateDoc(doc(db,'shorts',r.id),{'thumbnail.url':'https://evil.test/p.jpg'}))
})
test('manutenção REST preserva metadados e não revive removido; imagem inválida não derruba leitura',async()=>{
 const r=await submitShort(input(1),visitor,{...deps,verify:async()=>({...await deps.verify(),thumbnailUrl:undefined})}),before=await store.get('shorts/'+r.id)
 assert.equal((await refreshThumbnails(deps)).eligible,1);assert.equal((await refreshThumbnails({...deps,apply:true})).refreshed,1);const {thumbnail,...rest}=await store.get('shorts/'+r.id);assert.equal(thumbnail.url,url);assert.deepEqual(rest,before);assert.equal((await refreshThumbnails({...deps,apply:true})).eligible,0)
 await store.transact(async tx=>{const current=await tx.get('shorts/'+r.id);tx.set('shorts/'+r.id,{...current,thumbnail:{...current.thumbnail,url:'https://evil.test/p.jpg'}})});assert.equal((await readFeed({},store)).items[0].thumbnail,undefined)
 const raced={...deps,apply:true,verify:async()=>{await store.transact(async tx=>{const current=await tx.get('shorts/'+r.id);tx.set('shorts/'+r.id,{...current,moderationStatus:'removed'})});return deps.verify()}};assert.equal((await refreshThumbnails(raced)).conflicts,1);assert.equal((await store.get('shorts/'+r.id)).moderationStatus,'removed');assert.equal((await readFeed({},store)).items.length,0)
})
test('imagem ausente ou rejeitada não bloqueia publicação nem altera cota de cinco e duplicatas',async()=>{
 for(let n=0;n<5;n++){const result=await submitShort(input(n),visitor,{...deps,verify:async()=>({...await deps.verify(),thumbnailUrl:'https://evil.test/p.jpg'})});assert.equal((await store.get('shorts/'+result.id)).thumbnail,undefined)}
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video')
})
