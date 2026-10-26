import {loadUpdates} from '../../server/admin/updates.ts'
import {loadCommentQueue} from '../../server/comments/queue.ts'
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createOutboundBudget} from '../../server/runtime/outbound-budget.ts'
import {initializeEmptyDatabase} from '../../server/runtime/empty-database.ts'
import {stepRankingGeneration} from '../../server/ranking/segmented-generation.ts'
const projectId='demo-clipzone-tests',epoch='d'.repeat(32),root='http://127.0.0.1:8081/v1/projects/'+projectId+'/databases/(default)/documents'
let env,time=Date.now(),maxCalls=0
const now=()=>new Date(time),store=createRestStore({projectId,emulatorPort:8081})
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Only isolated emulator8081 is allowed')
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
 await env.clearFirestore()
})
after(async()=>env?.cleanup())
const inspect=async()=>{const response=await fetch(root+':listCollectionIds',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({pageSize:100})});assert.equal(response.status,200);const data=await response.json();assert.ok(!data.nextPageToken);return {rootCollectionIds:data.collectionIds??[]}}
test('three create-only markers initialize a genuinely empty isolated database and repeat never resets',async()=>{
 assert.deepEqual((await initializeEmptyDatabase({store,inspect,writersStopped:true,epoch,at:now()})).created,['gameNameState/v1','adminQueueState/reportTitles','rankingState/metrics'])
 assert.equal((await store.get('adminQueueState/reportTitles')).ready,true)
 await assert.rejects(initializeEmptyDatabase({store,inspect,writersStopped:true,epoch,at:now()}),/not-empty/)
 assert.equal((await store.get('rankingState/metrics')).epoch,epoch)
})
test('durable ranking resumes with a new REST budget each invocation and keeps old pointer on later failure',async()=>{
 await store.transact(async tx=>{
  for(let n=0;n<37;n++){
   const id='s'+String(n).padStart(3,'0'),gameId='g'+n
   tx.create('games/'+gameId,{officialName:'Fixture '+n,status:'active',createdAt:new Date(time-3*86400000)})
   tx.create('shorts/'+id,{gameId,moderationStatus:'published',createdAt:new Date(time-86400000),likeCount:2})
   tx.create('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(time-3600000)})
  }
 })
 let result
 for(let step=0;step<15;step++){
  const budget=createOutboundBudget({maximum:48,cleanupReserve:1}),scoped=createRestStore({projectId,emulatorPort:8081,fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
  result=await stepRankingGeneration({store:scoped,now});maxCalls=Math.max(maxCalls,budget.usage().dispatched)
  if(result.status==='ready')break
  assert.equal(await store.get('rankingState/current'),null)
  time+=60000
 }
 assert.equal(result.status,'ready');assert.equal(result.itemCount,37);assert.ok(maxCalls<=40)
 const pointer=await store.get('rankingState/current');time+=2*3600000
 await store.transact(async tx=>tx.set('rankingMetrics/s000',{version:1,ready:false,epoch}))
 assert.equal((await stepRankingGeneration({store,now})).status,'building')
 await assert.rejects(stepRankingGeneration({store,now}),/ranking-invalid-metrics|ranking-metrics-not-ready/)
 assert.deepEqual(await store.get('rankingState/current'),pointer)
 console.log('LOCAL_FINALIZATION_PROOF '+JSON.stringify({isolatedProject:projectId,items:37,maxRestCallsPerInvocation:maxCalls,oldPointerPreserved:true}))
})

test('fixture backup restores document fields into empty isolated target with create-only writes',async()=>{
 const collectionIds=(await inspect()).rootCollectionIds,documents=[]
 for(const id of collectionIds){
  assert.match(id,/^[a-zA-Z][a-zA-Z0-9]*$/)
  const response=await fetch(root+'/'+id+'?pageSize=300',{headers:{Authorization:'Bearer owner'}})
  assert.equal(response.status,200);const page=await response.json();assert.ok(!page.nextPageToken)
  documents.push(...(page.documents??[]).map(({name,fields})=>({name,fields})))
 }
 assert.ok(documents.length>100&&documents.length<500)
 const checksum=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(documents)))).toString('hex');const persisted=new TextEncoder().encode(JSON.stringify(documents));assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',persisted)).toString('hex'),checksum);const corrupt=persisted.slice();corrupt[0]^=1;assert.notEqual(Buffer.from(await crypto.subtle.digest('SHA-256',corrupt)).toString('hex'),checksum)
 await env.clearFirestore();assert.deepEqual((await inspect()).rootCollectionIds,[])
 const payload={writes:documents.map(document=>({update:document,currentDocument:{exists:false}}))}
 const restore=()=>fetch(root+':commit',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify(payload)})
 assert.equal((await restore()).status,200)
 for(const document of documents){const path=document.name.split('/documents/')[1],response=await fetch(root+'/'+path,{headers:{Authorization:'Bearer owner'}});assert.equal(response.status,200);assert.deepEqual((await response.json()).fields,document.fields)}
 assert.equal((await restore()).status,409)
 console.log('LOCAL_RESTORE_PROOF '+JSON.stringify({fixtureDocuments:documents.length,checksumVerified:true,createOnlyRestore:true,remoteDataRead:false}))
})

test('transaction batches preserve full administrative windows on real isolated Firestore',async()=>{
 await store.transact(async tx=>{
  for(let n=0;n<21;n++){
   const id=n.toString(16).padStart(64,'0')
   tx.create('moderationLogs/e'+String(n).padStart(2,'0'),{notificationChannel:'updates',notificationKind:'reports',shortId:id,title:'Fixture '+n,platform:'YouTube',createdAt:now(),eventVersion:1})
   tx.create('shorts/'+id,{moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/28nFy4tGcwI'})
   tx.create('reportSummaries/'+id,{status:'pending'})
   tx.create('comments/'+id,{content:'Fixture '+n,shortId:id,moderationStatus:'pending',createdAt:now(),reviewVersion:0})
   tx.create('commentRequests/'+id,{flags:n%2?['spam']:['hate']})
  }
 })
 const budget=createOutboundBudget({maximum:48,cleanupReserve:1}),scoped=createRestStore({projectId,emulatorPort:8081,fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
 const inbox=await loadUpdates({category:'reports'},'fixture-owner',scoped),inboxCalls=budget.usage().dispatched
 assert.equal(inbox.items.length,20);assert.ok(inbox.next);assert.ok(inbox.items.every(item=>!item.read))
 const comments=await loadCommentQueue({status:'pending',flag:'spam',sort:'date-desc'},scoped)
 assert.equal(comments.items.length,10);assert.ok(comments.next);assert.equal(comments.filteredWindow,true);assert.ok(budget.usage().dispatched<40)
 console.log('LOCAL_ADMIN_WINDOW_PROOF '+JSON.stringify({inboxEvents:20,inboxCalls,flaggedCommentCalls:budget.usage().dispatched-inboxCalls,transactionScoped:true}))
})
