import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadCommentQueue} from '../server/comments/queue.ts'
import {loadQueue} from '../server/moderation/queue.ts'
import {loadAdminHistory} from '../server/admin/history.ts'
import {handleAdminModeration} from '../server/http/admin-moderation.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
const id=n=>n.toString(16).padStart(64,'0'),at=n=>new Date(Date.UTC(2026,9,23,0,n))
function memory(){
 const records=new Map(),calls=[]
 const store={transact:async work=>work({get:async path=>{calls.push(['get',path]);return records.get(path)??null},set:()=>{throw Error('No writes permitted')},create:()=>{throw Error('No writes permitted')}}),adminListPage:async q=>{
  calls.push(['list',q]);let rows=[...records].filter(([path,data])=>path.startsWith(q.kind+'/')&&data[q.kind==='comments'||q.kind==='shorts'?'moderationStatus':'status']===q.filter).map(([path,data])=>({id:path.split('/')[1],data})).sort((a,b)=>a.id.localeCompare(b.id));if(q.cursor)rows=rows.filter(r=>r.id>q.cursor.id);return rows.slice(0,q.limit)
 },query:async q=>{
  calls.push(['history',q]);let rows=[...records].filter(([path,data])=>path.startsWith(q.collection+'/')&&data[q.filter.field]===q.filter.value).map(([path,data])=>({id:path.split('/')[1],data})).sort((a,b)=>b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id));if(q.cursor)rows=rows.filter(r=>r.data.createdAt<new Date(q.cursor.time)||r.data.createdAt.getTime()===Date.parse(q.cursor.time)&&r.id<q.cursor.id);return rows.slice(0,q.limit)
 }};return {records,calls,store}
}
test('comment signal filter reaches later windows, including after an empty first window, without unbounded reads',async()=>{
 const {records,calls,store}=memory();for(let n=1;n<=43;n++){records.set('comments/'+id(n),{content:'Comment '+n,shortId:id(99),moderationStatus:'pending',createdAt:at(n),reviewVersion:0});records.set('commentRequests/'+id(n),{flags:n>20&&n%2?['spam']:['threat'],visitorHash:'private'})}
 const query={status:'pending',sort:'date-asc',flag:'spam'},a=await loadCommentQueue(query,store),b=await loadCommentQueue({...query,cursor:a.next},store),c=await loadCommentQueue({...query,cursor:b.next},store)
 assert.equal(a.items.length,0);assert.ok(a.next);assert.deepEqual([...b.items,...c.items].map(x=>x.id),Array.from({length:12},(_,i)=>id(21+2*i)));assert.equal(c.next,null)
 assert.equal(calls.filter(c=>c[0]==='get').length,43);assert.ok(calls.filter(c=>c[0]==='list').every(c=>c[1].limit===21));assert.ok(!JSON.stringify([a,b,c]).includes('visitorHash'))
 await assert.rejects(loadCommentQueue({...query,flag:'threat',cursor:a.next},store),/invalid-input/)
 await assert.rejects(loadCommentQueue({...query,sort:'date-desc',cursor:a.next},store),/invalid-input/)
 await assert.rejects(loadCommentQueue({...query,status:'approved',cursor:a.next},store),/invalid-input/)
 await assert.rejects(loadCommentQueue({...query,flag:'unknown'},store),/invalid-input/)
})
test('blocked and unpublished queues remain distinct and use filter-bound cursors',async()=>{
 const {records,store}=memory();for(let n=1;n<=24;n++)records.set('shorts/'+id(n),{title:'Video '+n,moderationStatus:'pending',createdAt:at(n),...(n>20?{administrativeBlock:{previousStatus:'published',blockedAt:at(30)}}:{})})
 const a=await loadQueue({queue:'blocked',sort:'date-asc'},store);assert.equal(a.items.length,0);assert.ok(a.next)
 const b=await loadQueue({queue:'blocked',sort:'date-asc',cursor:a.next},store);assert.deepEqual(b.items.map(x=>x.id),[21,22,23,24].map(id));assert.equal(b.next,null)
 const unblocked=await loadQueue({queue:'unblocked',sort:'date-asc'},store);assert.equal(unblocked.items.length,20)
 await assert.rejects(loadQueue({queue:'unblocked',sort:'date-asc',cursor:a.next},store),/invalid-input/)
})
test('reviewed report summaries are available without bringing open reports into the history queue',async()=>{
 const {records,calls,store}=memory();records.set('reportSummaries/'+id(1),{title:'Reviewed',status:'reviewed',count:2,reviewedCount:2,firstReportedAt:at(1)});records.set('reportSummaries/'+id(2),{title:'Open',status:'pending',count:1,firstReportedAt:at(2)})
 const page=await loadQueue({queue:'reviewed',sort:'date-asc'},store);assert.equal(page.items.length,1);assert.equal(page.items[0].title,'Reviewed');assert.equal(calls[0][1].filter,'reviewed')
})
test('history paginates UUID and 64-character log IDs, with immutable projection and actor/status details',async()=>{
 const {records,store}=memory();records.set('games/manual-game',{officialName:'Game'});for(let n=1;n<=43;n++)records.set('moderationLogs/'+(n%2?id(n):'00000000-0000-0000-0000-'+String(n).padStart(12,'0')),{contentId:'manual-game',contentType:'game',action:'hide',reason:'Review reason',createdAt:at(n),actorUid:'owner',previousStatus:'active',nextStatus:'hidden',before:{secret:'private'},visitorHash:'private'})
 const a=await loadAdminHistory({kind:'game',id:'manual-game'},store),b=await loadAdminHistory({kind:'game',id:'manual-game',cursor:a.next},store),c=await loadAdminHistory({kind:'game',id:'manual-game',cursor:b.next},store)
 assert.deepEqual([a.items.length,b.items.length,c.items.length],[20,20,3]);assert.equal(c.next,null);assert.equal(new Set([...a.items,...b.items,...c.items].map(x=>x.id)).size,43)
 assert.equal(a.items[0].actor,'owner');assert.equal(a.items[0].previousStatus,'active');assert.ok(!JSON.stringify(a).includes('private'))
 await assert.rejects(loadAdminHistory({kind:'game',id:'different',cursor:a.next},store),/invalid-input/)
})
test('history rejects invalid resource types, paths, missing records and cross-type events without writes',async()=>{
 const {records,store}=memory();for(const input of [{kind:'users',id:'owner'},{kind:'game',id:'../game'},{kind:'short',id:'x'},{kind:'game',id:'valid',extra:'bad'},{kind:'game',id:'valid',cursor:{time:at(1).toISOString(),id:'log',scope:'game:other'}}])await assert.rejects(loadAdminHistory(input,store),/invalid-input/)
 await assert.rejects(loadAdminHistory({kind:'game',id:'valid'},store),/record-unavailable/)
 records.set('games/valid',{});records.set('moderationLogs/'+id(1),{contentId:'valid',contentType:'comment',createdAt:at(1),reason:'Wrong type'});assert.equal((await loadAdminHistory({kind:'game',id:'valid'},store)).items.length,0)
})
test('new history endpoint retains origin, method, admission and current authorization checks',async()=>{
 const origin='https://clipzone.test',{records,store}=memory();records.set('games/valid',{});const base={origin,store,now:()=>at(1),verify:async()=>{},checkAbuse:async()=>true,admin:{authorize:async()=>({uid:'owner'})}}
 const req=(patch={})=>new Request(origin+'/api/admin/history',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...patch},body:JSON.stringify({kind:'game',id:'valid'})})
 assert.equal((await handleAdminModeration(req(),base)).status,200)
 assert.equal((await handleAdminModeration(req({Origin:'https://other.test'}),base)).status,403)
 assert.equal((await handleAdminModeration(req(),{...base,admin:undefined})).status,503)
 assert.equal((await handleAdminModeration(req(),{...base,checkAbuse:async()=>false})).status,429)
 for(const code of ['totp-required','admin-forbidden'])assert.equal((await handleAdminModeration(req(),{...base,admin:{authorize:async()=>{throw new AdminAuthError(code,403)}}})).status,403)
 assert.equal((await handleAdminModeration(new Request(origin+'/api/admin/history'),base)).status,405)
})
