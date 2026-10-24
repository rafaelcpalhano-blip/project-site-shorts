import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {loadCommentQueue} from '../../server/comments/queue.ts'
import {loadQueue} from '../../server/moderation/queue.ts'
import {loadAdminHistory} from '../../server/admin/history.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),id=n=>n.toString(16).padStart(64,'0'),at=n=>new Date(Date.UTC(2026,9,23,0,n));let env
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado8081')
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore()
 await store.transact(async tx=>{
  tx.set('games/manual-history',{officialName:'History game'})
  for(let n=1;n<=43;n++){
   tx.set('comments/'+id(n),{content:'Comment '+String(n).padStart(2,'0'),shortId:id(99),moderationStatus:'pending',createdAt:at(n),reviewVersion:0})
   tx.set('commentRequests/'+id(n),{flags:n>20?['spam']:['threat'],visitorHash:'private'})
   tx.set('shorts/'+id(n),{title:'Video '+String(n).padStart(2,'0'),moderationStatus:'pending',createdAt:at(n),...(n>20?{administrativeBlock:{previousStatus:'published',blockedAt:at(50)}}:{})})
   tx.set('moderationLogs/'+(n%2?id(n):'00000000-0000-0000-0000-'+String(n).padStart(12,'0')),{contentId:'manual-history',contentType:'game',action:'hide',createdAt:at(n),actorUid:'fixture-owner',reason:'Fixture review',visitorHash:'private'})
  }
  for(const status of ['pending','reviewed'])tx.set('reportSummaries/'+id(status==='pending'?90:91),{title:status,status,count:1,reviewedCount:status==='pending'?0:1,firstReportedAt:at(1),lastReportedAt:at(2)})
 })
});after(async()=>env?.cleanup())
async function all(read){let cursor;const items=[];do{const page=await read(cursor);assert.ok(page.items.length<=20);items.push(...page.items);cursor=page.next}while(cursor);return items}
test('real REST filters traverse all windows in four orders without truncation or duplicates',async()=>{
 for(const sort of ['date-asc','date-desc','text-asc','text-desc']){
  const comments=await all(cursor=>loadCommentQueue({status:'pending',flag:'spam',sort,cursor},store));assert.equal(comments.length,23);assert.equal(new Set(comments.map(x=>x.id)).size,23);assert.ok(comments.every(x=>Number.parseInt(x.id,16)>20))
  const blocked=await all(cursor=>loadQueue({queue:'blocked',sort,cursor},store)),unblocked=await all(cursor=>loadQueue({queue:'unblocked',sort,cursor},store));assert.equal(blocked.length,23);assert.equal(unblocked.length,20);assert.equal(new Set([...blocked,...unblocked].map(x=>x.id)).size,43)
 }
})
test('real REST returns reviewed summaries using existing status/order query',async()=>{
 for(const queue of ['reports','reviewed']){const result=await loadQueue({queue,sort:'date-desc'},store);assert.equal(result.items.length,1);assert.equal(result.items[0].title,queue==='reports'?'pending':'reviewed')}
})
test('real REST history cursor supports existing UUID and digest log IDs across three pages',async()=>{
 const events=await all(cursor=>loadAdminHistory({kind:'game',id:'manual-history',cursor},store));assert.equal(events.length,43);assert.equal(new Set(events.map(e=>e.id)).size,43);assert.equal(events[0].createdAt,at(43).toISOString());assert.ok(!JSON.stringify(events).includes('private'))
})
