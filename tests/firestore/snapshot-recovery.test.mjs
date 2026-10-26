import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {rehearseIsolatedRestore} from '../helpers/snapshot-recovery-rehearsal.ts'
import {recoveryFixture,recoveryOptions,recoveryResource} from '../helpers/snapshot-recovery-fixture.ts'
const endpoint='http://127.0.0.1:8081/v1/'+recoveryResource
let env
before(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8081','Only the dedicated isolated test emulator is permitted')
 env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
// Clear only disposable synthetic data in this dedicated emulator/file; never port8080 or remote.
beforeEach(async()=>env.clearFirestore())
after(async()=>env?.cleanup())
const localFetch=async(input,init)=>{
 const url=new URL(String(input));assert.equal(url.origin,'http://127.0.0.1:8081');assert.ok(url.pathname.startsWith('/v1/'+recoveryResource));assert.equal(init?.redirect,'error')
 return fetch(input,init)
}
const get=path=>localFetch(endpoint+'/'+path,{redirect:'error',headers:{Authorization:'Bearer owner'}})
test('new snapshot format restores real isolated Firestore with raw precision, references, subcollections and new metadata',async()=>{
 const snapshot=await recoveryFixture(),result=await rehearseIsolatedRestore(snapshot,{...recoveryOptions,fetcher:localFetch})
 assert.equal(result.verifiedDocuments,4);assert.equal(result.missingParentsNotCreated,1)
 const game=await (await get('games/g1')).json()
 assert.equal(game.fields.large.integerValue,'9223372036854775807');assert.equal(game.fields.small.integerValue,'-9223372036854775808')
 assert.equal(game.fields.at.timestampValue,'2020-01-01T11:59:59.123456Z')
 assert.notEqual(game.createTime,snapshot.documents.find(row=>row.path==='games/g1').createTime)
 assert.equal((await get('shorts/missing')).status,404)
 assert.equal((await get('shorts/missing/comments/c1')).status,200)
 assert.equal((await get('metadata/empty')).status,200)
 console.log('ISOLATED_SNAPSHOT_RECOVERY_PROOF '+JSON.stringify({project:'demo-clipzone-tests',port:8081,documents:4,rawFieldsVerified:true,int64AndStoredMicrosecondsPreserved:true,sourceMetadataNanosecondsKeptInSnapshotNotRewritten:true,missingParentNotCreated:true,outputMetadataRecreated:true,remoteDataUsed:false}))
})
test('existing target is refused without sending another commit or overwriting data',async()=>{
 const snapshot=await recoveryFixture();await rehearseIsolatedRestore(snapshot,{...recoveryOptions,fetcher:localFetch})
 const before=await (await get('games/g1')).json(),operations=[]
 await assert.rejects(rehearseIsolatedRestore(snapshot,{...recoveryOptions,fetcher:async(input,init)=>{operations.push(String(input).split(':').at(-1));return localFetch(input,init)}}),/^Error: isolated-restore-refused$/)
 assert.deepEqual(operations,['listCollectionIds']);assert.deepEqual(await (await get('games/g1')).json(),before)
})
test('concurrent creation after empty inspection rejects the whole batch without partial restoration',async()=>{
 const snapshot=await recoveryFixture();let commits=0
 await assert.rejects(rehearseIsolatedRestore(snapshot,{...recoveryOptions,fetcher:async(input,init)=>{
  if(String(input).endsWith(':commit')){
   commits++
   const seed=await localFetch(endpoint+':commit',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({writes:[{update:{name:recoveryResource+'/games/g1',fields:{sentinel:{stringValue:'Existing fixture preserved'}}},currentDocument:{exists:false}}]})});assert.equal(seed.status,200)
  }
  return localFetch(input,init)
 }}),/^Error: isolated-restore-commit-rejected$/)
 assert.equal(commits,1);assert.deepEqual((await (await get('games/g1')).json()).fields,{sentinel:{stringValue:'Existing fixture preserved'}})
 for(const path of ['shorts/s1','metadata/empty','shorts/missing/comments/c1'])assert.equal((await get(path)).status,404)
})
test('modified snapshot fails integrity before any emulator request or write',async()=>{
 const input=await recoveryFixture();input.documents[0].fields.changed={stringValue:'tampered'};let calls=0
 await assert.rejects(rehearseIsolatedRestore(input,{...recoveryOptions,fetcher:async(...args)=>{calls++;return localFetch(...args)}}),/^Error: isolated-restore-refused$/);assert.equal(calls,0)
 assert.equal((await get('games/g1')).status,404)
})
test('lost acknowledgment after a real commit is reported unknown without retry or automatic deletion',async()=>{
 let commits=0
 await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:async(input,init)=>{
  const response=await localFetch(input,init)
  if(String(input).endsWith(':commit')){commits++;assert.equal(response.status,200);await response.body?.cancel();throw Error('simulated lost acknowledgment')}
  return response
 }}),/^Error: isolated-restore-outcome-unknown$/)
 assert.equal(commits,1)
 for(const path of ['games/g1','shorts/s1','metadata/empty','shorts/missing/comments/c1'])assert.equal((await get(path)).status,200)
})
