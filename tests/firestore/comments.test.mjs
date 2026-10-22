import { readComments } from '../../server/public/read-content.ts'
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,getDocs,setDoc,collection,query,where,limit,orderBy,documentId} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {reviewComment,parseCommentReview} from '../../server/comments/review-comment.ts'
import {loadCommentQueue,loadCommentDetail} from '../../server/comments/queue.ts'
const projectId='demo-clipzone-tests',shortId='a'.repeat(64),visitor='b'.repeat(64)
const now=()=>new Date('2026-10-21T12:00:00Z')
const store=createRestStore({projectId,emulatorPort:8081}),options={store,now}
const input=patch=>({shortId,content:'Boa jogada!',requestId:crypto.randomUUID(),...patch})
const review=(id,patch={})=>parseCommentReview({commentId:id,action:'approve',revision:0,reason:'Contexto conferido pelo administrador',...patch})
let environment
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador isolado')
 environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
after(async()=>{await environment?.cleanup()})
async function seed(){
 await environment.clearFirestore()
 await store.transact(async tx=>{tx.set('games/portal',{officialName:'Portal',status:'active'});tx.set('shorts/'+shortId,{gameId:'portal',platform:'Twitch',platformVideoId:'CommentClip',normalizedUrl:'https://clips.twitch.tv/CommentClip',title:'Jogada',moderationStatus:'published',commentCount:0,createdAt:now()})})
 return environment.unauthenticatedContext().firestore()
}
const read=path=>store.transact(tx=>tx.get(path))
const publicQuery=(db,maximum=21)=>query(collection(db,'comments'),where('shortId','==',shortId),
 where('moderationStatus','==','approved'),orderBy('createdAt','desc'),orderBy(documentId(),'desc'),limit(maximum))

test('REST concurrent retries create exactly one comment/audit and protect private receipts and client writes',async()=>{
 const db=await seed(),data=input()
 const results=await Promise.all([submitComment(data,visitor,options),submitComment(data,visitor,options),submitComment(data,visitor,options)])
 assert.equal(new Set(results.map(item=>item.id)).size,1)
 assert.equal(results.filter(item=>item.repeated).length,2)
 assert.equal((await read('shorts/'+shortId)).commentCount,1)
 assert.equal((await readComments({shortId},store)).total,1)
 const id=results[0].id
 await assertFails(getDoc(doc(db,'comments',id)))
 const publicComment=(await readComments({shortId},store)).items[0]
 assert.equal(publicComment.content,'Boa jogada!')
 assert.equal(publicComment.visitorHash,undefined)
 await assertFails(getDocs(publicQuery(db)))
 await assertFails(getDoc(doc(db,'commentRequests',id)))
 await assertFails(getDoc(doc(db,'commentDedup','a'.repeat(64))))
 await assertFails(getDoc(doc(db,'commentAttempts',visitor)))
 await assertFails(setDoc(doc(db,'comments','forged'),{shortId,moderationStatus:'approved',content:'forged'}))
 await assertFails(setDoc(doc(environment.authenticatedContext('owner',{admin:true}).firestore(),'comments',id),{moderationStatus:'approved'}))
 const detail=await loadCommentDetail({commentId:id},store)
 assert.equal(detail.logs.length,1)
 assert.ok(!JSON.stringify(detail).includes(visitor))
 await assertFails(getDocs(publicQuery(db,22)))
})
test('pending stays private; approval, removal, restoration and parent removal control actual public reads',async()=>{
 const db=await seed()
 const {id}=await submitComment(input({content:'caralho'}),visitor,options)
 await assertFails(getDoc(doc(db,'comments',id)))
 assert.equal((await readComments({shortId},store)).items.length,0)
 assert.equal((await read('shorts/'+shortId)).commentCount,0)
 assert.equal((await loadCommentQueue({status:'pending'},store)).items[0].id,id)
 await reviewComment(review(id),'owner',options)
 assert.equal((await read('shorts/'+shortId)).commentCount,1)
 assert.equal((await readComments({shortId},store)).items[0].id,id)
 await reviewComment(review(id,{action:'remove',revision:1}),'owner',options)
 assert.equal((await read('shorts/'+shortId)).commentCount,0)
 await assertFails(getDoc(doc(db,'comments',id)))
 await reviewComment(review(id,{action:'restore',revision:2}),'owner',options)
 assert.equal((await read('shorts/'+shortId)).commentCount,1)
 assert.equal((await readComments({shortId},store)).items[0].id,id)
 await store.transact(async tx=>{
  const short=await tx.get('shorts/'+shortId);tx.set('shorts/'+shortId,{...short,moderationStatus:'removed'})
 })
 await assertFails(getDoc(doc(db,'comments',id)))
 await assertFails(getDocs(publicQuery(db)))
 const detail=await loadCommentDetail({commentId:id},store)
 assert.equal(detail.logs.length,4)
 assert.equal((await read('comments/'+id)).reviewVersion,3)
})
test('different requests with identical content race safely and do not consume video quota',async()=>{
 await seed()
 const results=await Promise.allSettled([submitComment(input(),visitor,options),submitComment(input(),visitor,options)])
 assert.equal(results.filter(item=>item.status==='fulfilled').length,1)
 assert.equal(results.find(item=>item.status==='rejected').reason.message,'duplicate-comment')
 assert.equal((await loadCommentQueue({status:'approved'},store)).items.length,1)
 const privateDocs=await store.transact(tx=>tx.get('submissionLimits/'+visitor+'-2026-10-21'))
 assert.equal(privateDocs,null)
 const later={store,now:()=>new Date(now().getTime()+60000)}
 assert.equal((await submitComment(input(),visitor,later)).status,'approved')
})
test('REST admin pagination supports legacy safe IDs, equal timestamps and rejects unsafe cursor paths',async()=>{
 await seed()
 await store.transact(async tx=>{
  for(let index=0;index<23;index++)tx.set('comments/legacy-'+index.toString().padStart(2,'0'),
   {shortId,content:'Texto '+index,moderationStatus:'pending',createdAt:now()})
 })
 const first=await loadCommentQueue({status:'pending'},store)
 const second=await loadCommentQueue({status:'pending',cursor:first.next},store)
 assert.equal(first.items.length,20);assert.equal(second.items.length,3)
 assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,23)
 await assert.rejects(store.query({collection:'comments',filter:{field:'moderationStatus',value:'pending'},orderBy:'createdAt',limit:21,
  cursor:{time:now().toISOString(),id:'../private'}}),/Cursor/)
})
test('concurrent administrative decisions commit once and leave immutable audit trail on stale retries',async()=>{
 await seed()
 const {id}=await submitComment(input({content:'merda'}),visitor,options)
 const results=await Promise.allSettled([reviewComment(review(id),'owner',options),reviewComment(review(id),'owner',options)])
 assert.equal(results.filter(item=>item.status==='fulfilled').length,1)
 assert.equal((await read('comments/'+id)).reviewVersion,1)
 assert.equal((await loadCommentDetail({commentId:id},store)).logs.length,2)
 await assert.rejects(reviewComment(review(id,{action:'remove'}),'owner',options),/stale-review/)
 assert.equal((await loadCommentDetail({commentId:id},store)).logs.length,2)
})
test('removed parent and request payload conflict never create partial comment or moderation writes',async()=>{
 await seed()
 const data=input(),{id}=await submitComment(data,visitor,options)
 await assert.rejects(submitComment({...data,content:'Texto diferente'},visitor,options),/request-conflict/)
 await reviewComment(review(id,{action:'remove'}),'owner',options)
 await store.transact(async tx=>tx.set('shorts/'+shortId,{moderationStatus:'removed'}))
 await assert.rejects(reviewComment(review(id,{action:'restore',revision:1}),'owner',options),/short-unavailable/)
 await assert.rejects(submitComment(input(),visitor,options),/short-unavailable/)
 assert.equal((await read('comments/'+id)).moderationStatus,'removed')
 assert.equal((await loadCommentDetail({commentId:id},store)).logs.length,2)
 assert.equal((await loadCommentQueue({status:'approved'},store)).items.length,0)
})


test('REST transaction gives exactly one first-publication event across concurrent visitors and retries',async()=>{
 await seed();const data=input()
 const results=await Promise.all([submitComment(data,visitor,options),submitComment(data,visitor,options),submitComment(input({content:'Outra contribuição'}),'c'.repeat(64),options)])
 assert.equal(results.filter(row=>row.firstPublished).length,1)
 assert.equal(results.find(row=>row.repeated).firstPublished,false)
 assert.equal((await read('shorts/'+shortId)).hasPublishedComments,true)
 const first=results.find(row=>row.firstPublished)
 await reviewComment(review(first.id,{action:'remove'}),'owner',options)
 assert.equal((await submitComment(input({content:'Nova mensagem'}),'d'.repeat(64),options)).firstPublished,false)
})
test('REST legacy approved/removed comments suppress celebration; pending alone does not',async()=>{
 for(const status of ['approved','removed','pending']){
  await seed()
  await store.transact(async tx=>tx.set('comments/legacy',{shortId,content:'Antigo',createdAt:now(),moderationStatus:status}))
  assert.equal((await submitComment(input(),visitor,options)).firstPublished,status==='pending')
 }
})
