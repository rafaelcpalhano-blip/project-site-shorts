import test, {before,after} from 'node:test'
import assert from 'node:assert/strict'
import {captureFirestoreSnapshot,verifyFirestoreSnapshot} from '../server/recovery/read-only-snapshot.ts'
const originalFetch=globalThis.fetch
before(()=>{globalThis.fetch=async()=>assert.fail('Real network forbidden in recovery fixtures')})
after(()=>{globalThis.fetch=originalFetch})
const projectId='demo-clipzone-tests',databaseId='(default)',root='projects/'+projectId+'/databases/(default)/documents',at='2026-10-26T12:00:40.000Z',earlier='2026-10-26T12:00:39.123456789Z'
const doc=(path,fields={})=>({name:root+'/'+path,fields,createTime:'2026-10-26T11:59:00Z',updateTime:earlier})
function setup(){
 const calls=[];let clock=Date.parse(at)+1000
 const read=async request=>{
  calls.push(request);assert.ok(request.signal instanceof AbortSignal);assert.equal(request.signal.aborted,false)
  const url=new URL(request.url);assert.equal(url.origin,'https://firestore.googleapis.com')
  const name=decodeURIComponent(url.pathname.slice('/v1/'.length));assert.ok(name.startsWith(root))
  if(request.method==='POST'){
   assert.equal(url.search,'');assert.equal(request.body.readTime,at);assert.equal(request.body.pageSize,100)
   assert.ok(name.endsWith(':listCollectionIds'))
   const parent=name.slice(root.length,-':listCollectionIds'.length).replace(/^\//,'')
   if(!parent)return request.body.pageToken?{collectionIds:['shorts']}:{collectionIds:['games'],nextPageToken:'root-2'}
   return parent==='shorts/gone'?{collectionIds:['comments']}:{}
  }
  assert.equal(request.method,'GET');assert.equal(request.body,undefined);assert.equal(url.searchParams.get('readTime'),at);assert.equal(url.searchParams.get('showMissing'),'true');assert.equal(url.searchParams.get('pageSize'),'100');assert.equal(url.searchParams.has('mask'),false);assert.equal(url.searchParams.has('orderBy'),false)
  const collection=name.slice(root.length+1)
  if(collection==='games')return url.searchParams.has('pageToken')?{documents:[{name:root+'/games/vazio',createTime:'2026-10-26T11:59:00Z',updateTime:earlier}]}:{documents:[doc('games/g1',{n:{integerValue:'9223372036854775807'},t:{timestampValue:earlier},data:{mapValue:{fields:{text:{stringValue:'Ação 🎮'}}}}})],nextPageToken:'games-2'}
  if(collection==='shorts')return {documents:[{name:root+'/shorts/gone'}]}
  if(collection==='shorts/gone/comments')return {documents:[doc('shorts/gone/comments/c1',{text:{stringValue:'Snapshot anterior à mudança'}})]}
  assert.fail('unexpected fixture collection')
 }
 return {calls,read,setClock:value=>{clock=value},options:{projectId,databaseId,readTime:at,now:()=>clock,limits:{requests:100,documents:100,responseBytes:100000},read}}
}
test('consistent read-only walk paginates collections/documents, discovers missing parents and preserves raw wire types',async()=>{
 const f=setup();const snapshot=await captureFirestoreSnapshot(f.options)
 assert.equal(snapshot.requests,10);assert.equal(f.calls.length,10);assert.equal(snapshot.documents.length,3)
 assert.deepEqual(snapshot.collectionPaths,['games','shorts','shorts/gone/comments']);assert.deepEqual(snapshot.missingParentPaths,['shorts/gone'])
 assert.deepEqual(snapshot.documents.find(d=>d.path==='games/vazio').fields,{})
 assert.equal(snapshot.documents[0].fields.n.integerValue,'9223372036854775807');assert.equal(snapshot.documents[0].fields.t.timestampValue,earlier)
 assert.equal(snapshot.documents.some(d=>d.path==='shorts/gone'),false)
 await verifyFirestoreSnapshot(snapshot,{projectId,databaseId})
})
test('unapproved project/database, invalid read time and invalid budgets fail before any transport call',async()=>{
 for(const patch of [{projectId:'clipzone-db02a2'},{databaseId:'wrong'},{readTime:'not-a-time'},{readTime:'2026-02-30T12:00:40.000Z'},{readTime:'2026-10-26T13:00:40.000Z'},{readTime:'2026-10-26T11:00:40.000Z'},{limits:{requests:0,documents:10,responseBytes:1000}},{limits:{requests:10001,documents:10,responseBytes:1000}}]){
  const f=setup();await assert.rejects(captureFirestoreSnapshot({...f.options,...patch}));assert.equal(f.calls.length,0)
 }
})
test('request, document and response byte ceilings abort instead of returning a partial snapshot',async()=>{
 for(const limits of [{requests:2,documents:100,responseBytes:100000},{requests:100,documents:1,responseBytes:100000},{requests:100,documents:100,responseBytes:20}]){
  const f=setup();await assert.rejects(captureFirestoreSnapshot({...f.options,limits}),/snapshot-invalid-or-incomplete/)
  assert.ok(f.calls.length<=limits.requests)
 }
})
test('provider error envelopes and malformed lists cannot be mistaken for a successful empty backup',async()=>{
 for(const reply of [{error:{message:'private response'}},{collectionIds:'games'},{collectionIds:['..']},{collectionIds:['games/evil']},{collectionIds:[null]}]){
  const f=setup();await assert.rejects(captureFirestoreSnapshot({...f.options,read:async()=>reply}),/snapshot-invalid-or-incomplete/)
 }
 const f=setup();await assert.rejects(captureFirestoreSnapshot({...f.options,read:async()=>{throw Error('private bearer secret')}}),error=>error.message==='snapshot-invalid-or-incomplete')
})
test('repeated pagination tokens and duplicate collection/documents are bounded and fail closed',async()=>{
 for(const mode of ['collection-token','document-token','duplicate-collection','duplicate-document']){
  const f=setup();let calls=0
  await assert.rejects(captureFirestoreSnapshot({...f.options,read:async request=>{
   calls++
   if(mode==='collection-token')return {nextPageToken:'repeat'}
   if(request.method==='POST')return {collectionIds:mode==='duplicate-collection'?['games','games']:['games']}
   if(mode==='document-token')return {nextPageToken:'repeat'}
   return {documents:[doc('games/one'),doc('games/one')]}
  }}),/snapshot-invalid-or-incomplete/)
  assert.ok(calls<5)
 }
})
test('wrong project, escaped descendant and contradictory/missing document metadata cannot enter snapshot',async()=>{
 const invalid=[{...doc('games/a'),name:root.replace(projectId,'other')+'/games/a'},{...doc('games/a'),name:root+'/games/a/evil'},{...doc('games/a'),updateTime:undefined},{...doc('games/a'),updateTime:'2026-10-26T12:00:40.000000001Z'},{...doc('games/a'),fields:null},{...doc('games/a'),fields:{bad:undefined}},{...doc('games/a'),unexpected:'private'}]
 for(const row of invalid){const f=setup();await assert.rejects(captureFirestoreSnapshot({...f.options,read:async r=>r.method==='POST'?{collectionIds:['games']}:{documents:[row]}}),/snapshot-invalid-or-incomplete/)}
})
test('readTime expiring during traversal aborts without a completed result',async()=>{
 const f=setup();let calls=0
 await assert.rejects(captureFirestoreSnapshot({...f.options,read:async request=>{calls++;const result=await f.read(request);f.setClock(Date.parse(at)+3600000);return result}}),/snapshot-invalid-or-incomplete/);assert.equal(calls,1)
})
test('offline integrity verifies target and rejects changed content, duplicate paths and checksum without network',async()=>{
 const f=setup(),snapshot=await captureFirestoreSnapshot(f.options),calls=f.calls.length
 await assert.rejects(verifyFirestoreSnapshot(snapshot,{projectId:'clipzone-db02a',databaseId}))
 for(const mutate of [s=>{s.documents[0].fields.n.integerValue='1'},s=>{s.documents.push(s.documents[0])},s=>{s.sha256='0'.repeat(64)},s=>{s.collectionPaths.push('games')},s=>{s.missingParentPaths.push('../bad')}]){
  const changed=structuredClone(snapshot);mutate(changed);await assert.rejects(verifyFirestoreSnapshot(changed,{projectId,databaseId}))
 }
 assert.equal(f.calls.length,calls)
})
test('empty database is represented explicitly; failed traversal never invokes a write or default global transport',async()=>{
 const f=setup();let reads=0
 const snapshot=await captureFirestoreSnapshot({...f.options,read:async request=>{reads++;assert.equal(request.method,'POST');assert.ok(request.url.endsWith(':listCollectionIds'));return {}}})
 assert.equal(reads,1);assert.deepEqual(snapshot.documents,[]);assert.deepEqual(snapshot.collectionPaths,[]);await verifyFirestoreSnapshot(snapshot,{projectId,databaseId})
})
