import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,updateDoc,getDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
import {reviewShort,parseReview} from '../../server/moderation/review-short.ts'
import {loadDetail,loadQueue} from '../../server/moderation/queue.ts'
import {readFeed} from '../../server/public/read-content.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {reviewComment} from '../../server/comments/review-comment.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),now=()=>new Date(),visitor='a'.repeat(64),deps={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})};let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore();await store.transact(async tx=>tx.set('games/game',{officialName:'Jogo',status:'active'}))});after(async()=>env?.cleanup())
const input=i=>({url:'https://clips.twitch.tv/AdminBlockTest'+i,title:'Jogada '+i,gameId:'game'})
const decision=(id,action,revision)=>parseReview({shortId:id,action,revision,reportCount:0,reason:'Decisão administrativa de teste'})
test('bloqueio entra na fila pendente e sai do feed; liberar preserva cinco publicações e reserva',async()=>{
 const rows=[];for(let i=0;i<5;i++)rows.push(await submitShort(input(i),visitor,deps));const id=rows[0].id,before=await store.get('shorts/'+id)
 await reviewShort(decision(id,'block',0),'owner',deps);assert.ok(!(await readFeed({},store)).items.some(s=>s.id===id));assert.ok((await loadQueue({queue:'pending'},store)).items.some(s=>s.id===id));assert.equal((await loadDetail({shortId:id},store)).short.blocked,true);await reviewShort(decision(id,'approve',1),'owner',deps);assert.ok((await readFeed({},store)).items.some(s=>s.id===id));assert.deepEqual((await store.get('shorts/'+id)).createdAt,before.createdAt)
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video');assert.equal((await store.get('videoIdentities/'+id)).shortId,id)
 const detail=await loadDetail({shortId:id},store);assert.ok(detail.logs.some(l=>l.action==='block'));const logs=await store.query({collection:'moderationLogs',filter:{field:'contentId',value:id},orderBy:'createdAt',limit:10});const block=logs.find(l=>l.data.action==='block').data;assert.equal(block.actor,'owner');assert.equal(block.previousStatus,'published');assert.equal(block.resultingStatus,'pending');assert.ok(block.createdAt instanceof Date)
})
test('exclusão restaurável do bloqueado mantém bloqueio ao restaurar e não cria outro registro',async()=>{
 const {id}=await submitShort(input(1),visitor,deps);await reviewShort(decision(id,'block',0),'owner',deps);await reviewShort(decision(id,'remove',1),'owner',deps);assert.ok((await loadQueue({queue:'removed'},store)).items.some(row=>row.id===id));assert.equal((await reviewShort(decision(id,'restore',2),'owner',deps)).status,'pending');assert.equal((await loadDetail({shortId:id},store)).short.blocked,true);assert.equal((await reviewShort(decision(id,'approve',3),'owner',deps)).status,'published');assert.equal((await store.get('shorts/'+id)).administrativeBlock,undefined)
})
test('duas decisões simultâneas têm um vencedor e não duplicam auditoria ou alteram reserva',async()=>{
 const {id}=await submitShort(input(1),visitor,deps),results=await Promise.allSettled([reviewShort(decision(id,'block',0),'owner',deps),reviewShort(decision(id,'remove',0),'owner',deps)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.message,'stale-review');assert.equal((await store.get('videoIdentities/'+id)).shortId,id)
})
test('comentário removido via serviço existente tem auditoria e restauração; SDK não pode simular privilégio',async()=>{
 const {id}=await submitShort(input(1),visitor,deps),comment=await submitComment({shortId:id,content:'Uma bela jogada',requestId:crypto.randomUUID()},visitor,deps);await reviewComment({commentId:comment.id,action:'remove',revision:0,reason:'Revisão direta no visualizador'},'owner',deps);assert.equal((await store.get('comments/'+comment.id)).moderationStatus,'removed');const logs=await store.query({collection:'moderationLogs',filter:{field:'contentId',value:comment.id},orderBy:'createdAt',limit:10});assert.ok(logs.some(l=>l.data.action==='remove'&&l.data.actor==='owner'));await reviewComment({commentId:comment.id,action:'restore',revision:1,reason:'Decisão revisada pelo administrador'},'owner',deps);assert.equal((await store.get('comments/'+comment.id)).moderationStatus,'approved')
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('owner',{admin:true}).firestore()]){await assertFails(updateDoc(doc(db,'shorts',id),{moderationStatus:'pending',administrativeBlock:{previousStatus:'published'}}));await assertFails(getDoc(doc(db,'moderationLogs','private')))}
})
