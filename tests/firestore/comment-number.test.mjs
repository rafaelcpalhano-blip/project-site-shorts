import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {reviewComment,parseCommentReview} from '../../server/comments/review-comment.ts'
import {prepareCommentNumbers} from '../../server/comments/comment-number.ts'
import {readComments} from '../../server/public/read-content.ts'
const projectId='demo-clipzone-tests',shortId='a'.repeat(64),now=()=>new Date('2026-10-22T12:00:00Z'),store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('isolated emulator only');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
const read=path=>store.get(path),input=content=>({shortId,content,requestId:crypto.randomUUID()}),visitor=n=>n.toString(16).padStart(64,'0')
async function seed(){await env.clearFirestore();await store.transact(async tx=>{tx.set('games/game',{status:'active',officialName:'Jogo'});tx.set('shorts/'+shortId,{gameId:'game',moderationStatus:'published',commentCount:0,platform:'Twitch',platformVideoId:'SequenceClip',normalizedUrl:'https://clips.twitch.tv/SequenceClip',title:'Jogada',createdAt:now()})})}
async function review(id,action='approve',revision=0){return reviewComment(parseCommentReview({commentId:id,action,revision,reason:'Contexto conferido pelo administrador'}),'owner',options)}
test('novas publicações concorrentes recebem números únicos; retry não consome sequência',async()=>{
 await seed();const first=input('Jogada inicial');const results=await Promise.all([submitComment(first,visitor(1),options),submitComment(first,visitor(1),options),...Array.from({length:4},(_,n)=>submitComment(input('Jogada de teste '+n),visitor(n+2),options))])
 const page=await readComments({shortId},store);assert.deepEqual(page.items.map(row=>row.number),[5,4,3,2,1]);assert.equal((await read('shorts/'+shortId)).lastCommentNumber,5);assert.equal(results.filter(row=>row.repeated).length,1)
 const db=env.unauthenticatedContext().firestore();await assertFails(setDoc(doc(db,'comments',page.items[0].id),{publicationNumber:999}));await assertFails(setDoc(doc(db,'shorts',shortId),{lastCommentNumber:999}))
})
test('pendente/rejeitado não recebe número; aprovação atribui e restauração preserva sem reutilizar',async()=>{
 await seed();const pending=await submitComment(input('caralho'),visitor(1),options);assert.equal((await read('comments/'+pending.id)).publicationNumber,undefined)
 await review(pending.id,'reject');assert.equal((await read('comments/'+pending.id)).publicationNumber,undefined);await submitComment(input('Mensagem publicada antes da aprovação'),visitor(3),options);await review(pending.id,'approve',1);assert.equal((await read('comments/'+pending.id)).publicationNumber,2)
 await review(pending.id,'remove',2);await submitComment(input('Outra boa jogada'),visitor(2),options);await review(pending.id,'restore',3)
 assert.deepEqual((await readComments({shortId},store)).items.map(row=>row.number),[3,2,1]);assert.equal((await read('shorts/'+shortId)).lastCommentNumber,3)
})
test('migração histórica inclui removidos, desempata ID e é idempotente sob concorrência',async()=>{
 await seed();await store.transact(async tx=>{const short=await tx.get('shorts/'+shortId);tx.set('shorts/'+shortId,{...short,commentCount:1,hasPublishedComments:true});for(const [id,status]of [['old-a','removed'],['old-b','approved'],['old-c','pending']])tx.set('comments/'+id,{shortId,content:'Mensagem antiga '+id,createdAt:now(),moderationStatus:status,reviewVersion:0})})
 const before=await prepareCommentNumbers(shortId,store);assert.equal(before.changed,false);assert.equal((await read('comments/old-a')).publicationNumber,undefined)
 await assert.rejects(submitComment(input('Antes da preparação'),visitor(7),options),/comment-numbering-preparing/)
 const results=await Promise.all([prepareCommentNumbers(shortId,store,true),prepareCommentNumbers(shortId,store,true)]);assert.equal(results.filter(row=>row.changed).length,1)
 assert.equal((await read('comments/old-a')).publicationNumber,1);assert.equal((await read('comments/old-a')).moderationStatus,'removed');assert.equal((await read('comments/old-b')).publicationNumber,2);assert.equal((await read('comments/old-c')).publicationNumber,undefined)
 await submitComment(input('Depois da preparação'),visitor(7),options);await review('old-a','restore');assert.deepEqual((await readComments({shortId},store)).items.map(row=>row.number),[3,2,1]);assert.equal((await prepareCommentNumbers(shortId,store,true)).changed,false)
})
test('paginação de 20 mantém números, ignora nova publicação acima do cursor e não reutiliza removidos',async()=>{
 await seed();for(let n=1;n<=23;n++)await submitComment(input('Jogada numerada '+n),visitor(n),options)
 const one=await readComments({shortId},store);assert.deepEqual(one.items.map(row=>row.number),Array.from({length:20},(_,n)=>23-n));assert.equal(one.next.number,4)
 await submitComment(input('Nova jogada acima do cursor'),visitor(30),options)
 const two=await readComments({shortId,cursor:one.next},store);assert.deepEqual(two.items.map(row=>row.number),[3,2,1]);assert.equal(two.next,null)
 await review(one.items[10].id,'remove');assert.equal((await read('comments/'+one.items[10].id)).publicationNumber,13);assert.equal((await read('shorts/'+shortId)).lastCommentNumber,24)
})
