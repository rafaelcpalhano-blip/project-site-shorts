import test from 'node:test'
import assert from 'node:assert/strict'
import { moderateText } from '../server/comments/moderate-text.ts'
import { submitComment } from '../server/comments/submit-comment.ts'
import { parseCommentReview, reviewComment } from '../server/comments/review-comment.ts'
import { loadCommentQueue, loadCommentDetail } from '../server/comments/queue.ts'
import { createPublicApi } from '../server/http/public-api.ts'
import { handleComment } from '../server/http/comments.ts'
import { AdminAuthError } from '../server/auth/firebase-admin.ts'
import { createCommentClient } from '../src/features/comments/services/comment-api.ts'
const origin='https://clipzone.test',shortId='a'.repeat(64),visitor='b'.repeat(64)
const now=()=>new Date('2026-10-21T12:00:00Z')
const input=(patch={})=>({shortId,content:'Boa jogada!',requestId:crypto.randomUUID(),...patch})
function memory(){
 const records=new Map([['games/portal',{status:'active',officialName:'Portal'}],['shorts/'+shortId,{gameId:'portal',moderationStatus:'published',title:'Jogada'}]])
 let tail=Promise.resolve()
 const store={transact(work){
  const result=tail.then(async()=>{
   const writes=new Map()
   const result=await work({hasPublishedComment:async shortId=>[...records.entries()].some(([path,data])=>path.startsWith('comments/')&&data.shortId===shortId&&['approved','removed'].includes(data.moderationStatus)),get:async path=>structuredClone(records.get(path)??null),
    create:(path,value)=>{assert.ok(!records.has(path)&&!writes.has(path));writes.set(path,value)},
    set:(path,value)=>writes.set(path,value)})
   for(const [path,value] of writes)records.set(path,value)
   return result
  });tail=result.catch(()=>{});return result
 },async query(query){
  let rows=[...records.entries()].filter(([path,data])=>path.startsWith(query.collection+'/')&&data[query.filter.field]===query.filter.value)
   .map(([path,data])=>({id:path.slice(query.collection.length+1),data}))
   .sort((a,b)=>b.data[query.orderBy]-a.data[query.orderBy]||b.id.localeCompare(a.id))
  if(query.cursor)rows=rows.filter(item=>item.data[query.orderBy].toISOString()<query.cursor.time||
   item.data[query.orderBy].toISOString()===query.cursor.time&&item.id<query.cursor.id)
  return rows.slice(0,query.limit)
 }}
 return {store,records}
}
async function setup(maximum=20){
 const {store,records}=memory()
 let authCalls=0
 const api=await createPublicApi({origin,store,now,visitorSecret:'ab'.repeat(32),maximumAttempts:maximum,attemptWindowMs:60000,
  allowSessionIssuance:async()=>true,verify:async()=>({existence:'missing',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[]}),
  admin:{publicConfig:{},authorize:async request=>{
   authCalls++
   if(request.headers.get('authorization')!=='Bearer test-admin')throw new AdminAuthError('unauthorized',401)
   return {uid:'test-admin'}
  }}})
 const session=await api(req('/api/session'))
 const cookie=session.headers.get('set-cookie').split(';')[0]
 return {store,records,api,cookie,authCalls:()=>authCalls}
}
function req(path,body,cookie='',headers={},method='POST'){
 return new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...headers},
  ...(method==='POST'?{body:JSON.stringify(body??{})}:{})})
}
const review=(id,patch={})=>({commentId:id,action:'approve',revision:0,reason:'Contexto conferido pelo administrador',...patch})

test('text triage automatically approves ordinary gameplay and preserves original accents and punctuation',()=>{
 for(const text of ['Boa jogada!','Você matou o boss muito bem.','Que partida foda?'.replace('foda','boa'),'O minotauro caiu!','Olá, alguém joga às 20h?']){
  assert.deepEqual(moderateText(text),{status:'approved',flags:[]},text)
 }
})
test('isolated profanity, attacks, explicit threats, discrimination and spam remain pending',()=>{
 for(const [text,flag] of [['caralho','offensive-language'],['seu idiota','offensive-language'],
  ['PÓRRA','offensive-language'],['c4r4lh0','offensive-language'],['vou te matar','threat'],
  ['odeio gays','hate'],['Visite https://spam.test','spam'],['aaaaaaaaaaaa','spam'],['oi oi oi oi oi oi','spam']]){
  const result=moderateText(text);assert.equal(result.status,'pending',text);assert.ok(result.flags.includes(flag),text)
 }
})
test('one logical request is idempotent under concurrency and private bookkeeping never enters public comments',async()=>{
 const {store,records}=memory(),data=input()
 const results=await Promise.all([submitComment(data,visitor,{store,now}),submitComment(data,visitor,{store,now})])
 assert.equal(results[0].id,results[1].id);assert.equal(results.filter(item=>item.repeated).length,1)
 assert.equal([...records.keys()].filter(path=>path.startsWith('comments/')).length,1)
 const saved=records.get('comments/'+results[0].id)
 assert.equal(saved.moderationStatus,'approved');assert.equal(saved.content,'Boa jogada!')
 assert.ok(!JSON.stringify(saved).includes(visitor));assert.equal(saved.visitorHash,undefined);assert.equal(saved.flags,undefined)
 assert.equal([...records.keys()].filter(path=>path.startsWith('moderationLogs/')).length,1)
 assert.ok(![...records.keys()].some(path=>path.startsWith('submissionLimits/')))
 await assert.rejects(submitComment({...data,content:'Outro texto'},visitor,{store,now}),/request-conflict/)
})
test('recent identical comments with different requests are deduplicated without a permanent ban',async()=>{
 const {store,records}=memory()
 await submitComment(input(),visitor,{store,now})
 await assert.rejects(submitComment(input({content:'  Boa jogada!  '}),visitor,{store,now}),/duplicate-comment/)
 const later=()=>new Date(now().getTime()+60000)
 assert.equal((await submitComment(input(),visitor,{store,now:later})).status,'approved')
 assert.equal([...records.keys()].filter(path=>path.startsWith('comments/')).length,2)
})
test('removed videos reject comment creation and retries; two visitors cannot claim each other receipts',async()=>{
 const {store,records}=memory(),data=input()
 const first=await submitComment(data,visitor,{store,now})
 const other=await submitComment(data,'c'.repeat(64),{store,now})
 assert.notEqual(first.id,other.id)
 records.set('shorts/'+shortId,{moderationStatus:'removed'})
 await assert.rejects(submitComment(data,visitor,{store,now}),/short-unavailable/)
 assert.equal([...records.keys()].filter(path=>path.startsWith('comments/')).length,2)
})
test('public HTTP requires session, same origin, strict JSON and bounded body; privileged fields never reach storage',async()=>{
 const {api,cookie,records}=await setup()
 assert.equal((await api(req('/api/comments',input()))).status,401)
 assert.equal((await api(req('/api/comments',input(),cookie,{Origin:'https://evil.test'}))).status,403)
 assert.equal((await api(req('/api/comments',input(),cookie,{'Content-Type':'text/plain'}))).status,415)
 assert.equal((await api(req('/api/comments',input(),cookie,{'Content-Encoding':'gzip'}))).status,415)
 for(const patch of [{moderationStatus:'approved'},{visitorHash:visitor},{author:'forged'},{content:'x'.repeat(501)},{content:'bad\u0000text'},{requestId:'../id'},{shortId:'../private'}]){
  assert.equal((await api(req('/api/comments',input(patch),cookie))).status,400)
 }
 assert.equal((await api(req('/api/comments',input({content:'x'.repeat(9000)}),cookie))).status,413)
 assert.ok(![...records.keys()].some(path=>path.startsWith('comments/')))
 assert.equal((await handleComment(req('/api/comments',input()))).status,503)
 assert.equal((await api(req('/api/comments',undefined,cookie,{},'GET'))).status,405)
})
test('comment rate limit is independent of video quota and submission attempts',async()=>{
 const {api,cookie,records}=await setup(2)
 for(let index=0;index<3;index++){
  assert.equal((await api(req('/api/comments',input({content:''}),cookie))).status,index<2?400:429)
 }
 assert.equal((await api(req('/api/shorts',{url:'https://clips.twitch.tv/Example',gameId:'game'},cookie))).status,422)
 assert.ok(![...records.keys()].some(path=>path.startsWith('submissionLimits/')))
 assert.equal([...records.keys()].filter(path=>path.startsWith('commentAttempts/')).length,1)
})
test('HTTP distinguishes approved, pending, receipt replay and removed receipt without leaking stored content',async()=>{
 const {api,cookie,records}=await setup(),data=input()
 const first=await api(req('/api/comments',data,cookie));assert.equal(first.status,201)
 const approved=await first.json();assert.equal(approved.status,'approved')
 const replay=await api(req('/api/comments',data,cookie));assert.equal(replay.status,200)
 assert.equal((await replay.json()).repeated,true)
 records.get('comments/'+approved.id).moderationStatus='removed'
 assert.equal((await (await api(req('/api/comments',data,cookie))).json()).status,'removed')
 const pending=await api(req('/api/comments',input({content:'caralho'}),cookie));assert.equal(pending.status,202)
 assert.equal((await pending.json()).status,'pending')
 assert.equal(first.headers.get('cache-control'),'no-store')
})
test('admin endpoints authorize every request and never expose owner hashes or request fingerprints',async()=>{
 const {api,cookie,records,authCalls}=await setup()
 const posted=await (await api(req('/api/comments',input({content:'merda'}),cookie))).json()
 const path='/api/admin/comments/'
 assert.equal((await api(req(path+'queue',{status:'pending'},cookie))).status,401)
 const headers={Authorization:'Bearer test-admin'}
 const queue=await api(req(path+'queue',{status:'pending'},cookie,headers));assert.equal(queue.status,200)
 assert.equal((await queue.json()).items.length,1)
 const detail=await api(req(path+'detail',{commentId:posted.id},cookie,headers));assert.equal(detail.status,200)
 const text=await detail.text()
 for(const receipt of [...records.entries()].filter(([key])=>key.startsWith('commentRequests/')).map(([,value])=>value)){
  assert.ok(!text.includes(receipt.visitorHash));assert.ok(!text.includes(receipt.payloadHash))
 }
 assert.ok(text.includes('offensive-language'))
 assert.equal(authCalls(),3)
 assert.equal((await api(req(path+'review',{...review(posted.id),actor:'forged'},cookie,headers))).status,400)
})
test('admin approval, rejection, removal and restoration are revision checked, audited and parent constrained',async()=>{
 const {store,records}=memory()
 const result=await submitComment(input({content:'merda'}),visitor,{store,now})
 const approve=review(result.id)
 const results=await Promise.allSettled([reviewComment(parseCommentReview(approve),'owner',{store,now}),reviewComment(parseCommentReview(approve),'owner',{store,now})])
 assert.equal(results.filter(item=>item.status==='fulfilled').length,1)
 assert.equal(records.get('comments/'+result.id).moderationStatus,'approved')
 await reviewComment(parseCommentReview(review(result.id,{action:'remove',revision:1})),'owner',{store,now})
 records.set('shorts/'+shortId,{moderationStatus:'removed'})
 await assert.rejects(reviewComment(parseCommentReview(review(result.id,{action:'restore',revision:2})),'owner',{store,now}),/short-unavailable/)
 assert.equal(records.get('comments/'+result.id).reviewVersion,2)
 records.set('shorts/'+shortId,{gameId:'portal',moderationStatus:'published'})
 await reviewComment(parseCommentReview(review(result.id,{action:'restore',revision:2})),'owner',{store,now})
 assert.equal(records.get('comments/'+result.id).moderationStatus,'approved')
 const pending=await submitComment(input({content:'idiota'}),visitor,{store,now})
 await reviewComment(parseCommentReview(review(pending.id,{action:'reject'})),'owner',{store,now})
 assert.equal(records.get('comments/'+pending.id).moderationStatus,'rejected')
 assert.ok([...records.values()].some(value=>value.actor==='owner'&&value.reason===approve.reason))
})
test('bounded admin queues paginate identical timestamps and reject malformed filters, cursors and reviews',async()=>{
 const {store,records}=memory()
 for(let index=1;index<=23;index++)records.set('comments/'+index.toString(16).padStart(64,'0'),
  {shortId,content:'Texto '+index,createdAt:now(),moderationStatus:'pending'})
 const first=await loadCommentQueue({status:'pending'},store),second=await loadCommentQueue({status:'pending',cursor:first.next},store)
 assert.equal(first.items.length,20);assert.equal(second.items.length,3)
 assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,23)
 assert.equal(second.next,null)
 for(const data of [{status:'all'},{status:'pending',cursor:{time:'bad',id:'a'}},{status:'pending',filter:'private'}]){
  await assert.rejects(loadCommentQueue(data,store),/invalid-input/)
 }
 for(const patch of [{commentId:'../secret'},{revision:-1},{reason:'x'},{reason:'bad\nreason'},{action:'delete'},{actor:'forged'}]){
  assert.throws(()=>parseCommentReview(review('a'.repeat(64),patch)),/invalid-input/)
 }
 const detail=await loadCommentDetail({commentId:'1'.padStart(64,'0')},store)
 assert.equal(detail.comment.content,'Texto 1')
})
test('corrupt receipts and dedup dates fail closed without extra comments or audit',async()=>{
 const {store,records}=memory(),data=input()
 const result=await submitComment(data,visitor,{store,now})
 const receipt=records.get('commentRequests/'+result.id)
 receipt.visitorHash='c'.repeat(64)
 await assert.rejects(submitComment(data,visitor,{store,now}),/request-conflict/)
 receipt.visitorHash=visitor
 const recent=[...records.entries()].find(([path])=>path.startsWith('commentDedup/'))[1]
 recent.createdAt=new Date('invalid')
 await assert.rejects(submitComment(input(),visitor,{store,now}),/invalid-dedup/)
 assert.equal([...records.keys()].filter(path=>path.startsWith('comments/')).length,1)
 assert.equal([...records.keys()].filter(path=>path.startsWith('moderationLogs/')).length,1)
})

test('comment client preserves request UUID across retries, sends only public fields and never automatically retries',async()=>{
 const data=input(),calls=[]
 let fail=true
 const send=createCommentClient(async(path,options)=>{
  calls.push([path,options])
  if(path==='/api/session')return new Response(null,{status:204})
  if(fail)throw new Error('network interrupted')
  return Response.json({id:'d'.repeat(64),status:'approved',repeated:true,firstPublished:false},{status:200})
 })
 await assert.rejects(send(data))
 assert.equal(calls.length,2)
 fail=false;await send(data)
 assert.equal(calls[1][1].body,calls[3][1].body)
 assert.equal(calls[3][1].credentials,'same-origin')
 assert.deepEqual(JSON.parse(calls[3][1].body),data)
 const hidden=createCommentClient(async()=>Response.json({error:'private-secret',message:'do not display'},{status:503}))
 await assert.rejects(hidden(data),error=>!error.message.includes('do not display')&&!error.message.includes('private-secret'))
})


test('first published event is atomic, never replayed and survives deletion',async()=>{
 const {store,records}=memory(),data=input()
 const results=await Promise.all([submitComment(data,visitor,{store,now}),submitComment(data,visitor,{store,now}),submitComment(input({content:'Outra jogada'}),'c'.repeat(64),{store,now})])
 assert.equal(results.filter(row=>row.firstPublished).length,1)
 assert.equal(results.find(row=>row.repeated).firstPublished,false)
 const first=results.find(row=>row.firstPublished)
 await reviewComment(parseCommentReview({commentId:first.id,action:'remove',revision:0,reason:'Revisão do comentário'}),'owner',{store,now})
 assert.equal(records.get('shorts/'+shortId).hasPublishedComments,true)
 assert.equal((await submitComment(input({content:'Depois da remoção'}),'d'.repeat(64),{store,now})).firstPublished,false)
})
test('pending does not claim first publication, admin approval and legacy history suppress later celebrations',async()=>{
 for(const mode of ['pending','legacy-approved','legacy-removed','admin']){
  const {store,records}=memory()
  if(mode.startsWith('legacy'))records.set('comments/legacy',{shortId,content:'Antigo',createdAt:now(),moderationStatus:mode==='legacy-approved'?'approved':'removed'})
  else{
   const pending=await submitComment(input({content:'caralho'}),visitor,{store,now});assert.equal(pending.firstPublished,false)
   if(mode==='admin')await reviewComment(parseCommentReview({commentId:pending.id,action:'approve',revision:0,reason:'Contexto conferido'}),'owner',{store,now})
  }
  assert.equal((await submitComment(input({content:'Comentário normal'}),'e'.repeat(64),{store,now})).firstPublished,mode==='pending')
 }
})
test('client rejects impossible first-publication flags',async()=>{
 for(const payload of [{status:'pending',repeated:false,firstPublished:true},{status:'approved',repeated:true,firstPublished:true},{status:'approved',repeated:false}]){
  const send=createCommentClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({id:'a'.repeat(64),...payload},{status:payload.repeated?200:payload.status==='approved'?201:202}))
  await assert.rejects(send(input()),/Resposta inesperada/)
 }
})
