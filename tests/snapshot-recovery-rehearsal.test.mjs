import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {planIsolatedRestore,rehearseIsolatedRestore} from './helpers/snapshot-recovery-rehearsal.ts'
import {recoveryFixture,recoveryOptions} from './helpers/snapshot-recovery-fixture.ts'
const realFetch=globalThis.fetch
before(()=>{globalThis.fetch=()=>assert.fail('Real network forbidden in recovery rehearsal units')})
after(()=>{globalThis.fetch=realFetch})
const at='2026-10-26T12:00:00Z'
function memory(mode,mutate){
 const docs=new Map(),calls=[]
 const fetcher=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,'http://127.0.0.1:8081');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer owner')
  const op=url.pathname.split(':').at(-1),body=JSON.parse(init.body);calls.push({op,body})
  if(op==='listCollectionIds'){mutate?.();if(mode==='not-empty')return Response.json({collectionIds:['existing']});if(mode==='bad-inspection')return Response.json({error:'private'});return Response.json({})}
  if(op==='commit'){
   if(mode==='collision'){docs.set(body.writes[0].update.name,{sentinel:{stringValue:'preserved'}});return Response.json({error:'exists'},{status:409})}
   for(const write of body.writes){assert.deepEqual(write.currentDocument,{exists:false});assert.equal(docs.has(write.update.name),false)}
   for(const write of body.writes)docs.set(write.update.name,write.update.fields)
   if(mode==='ambiguous')throw Error('private upstream token')
   if(mode==='bad-receipt')return Response.json({commitTime:at,writeResults:[]})
   return Response.json({commitTime:at,writeResults:body.writes.map(()=>({updateTime:at}))})
  }
  assert.equal(op,'batchGet')
  return Response.json(body.documents.map(name=>({found:{name,fields:mode==='bad-readback'?{}:docs.get(name),createTime:at,updateTime:at},readTime:at})))
 }
 return {docs,calls,fetcher}
}
test('plan contains one atomic create-only batch with exact wire fields; missing parents and output timestamps are not recreated',async()=>{
 const snapshot=await recoveryFixture(),plan=await planIsolatedRestore(snapshot,recoveryOptions)
 assert.equal(plan.writes.length,4);assert.equal(plan.missingParentsNotCreated,1)
 assert.equal(plan.writes.some(w=>w.update.name.endsWith('/shorts/missing')),false)
 assert.deepEqual(plan.writes[0].update.fields,snapshot.documents[0].fields)
 assert.equal(plan.writes[0].update.createTime,undefined);assert.equal(plan.writes[0].update.updateTime,undefined)
 for(const row of plan.writes)assert.deepEqual(row.currentDocument,{exists:false})
})
test('remote targets, other emulator ports, active writers and missing explicit fixture intent fail before any I/O',async()=>{
 for(const patch of [{emulatorHost:'127.0.0.1:8080'},{emulatorHost:'firestore.googleapis.com'},{targetProjectId:'clipzone-db02a'},{writersStopped:false},{syntheticFixture:false},{maxDocuments:101},{maxDocuments:3}]){
  const f=memory();await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,...patch,fetcher:f.fetcher}),/^Error: isolated-restore-refused$/);assert.equal(f.calls.length,0)
 }
 const f=memory();await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:undefined}),/isolated-restore-refused/);assert.equal(f.calls.length,0)
})
test('tampered checksum and unsupported or contradictory wire types are refused before target inspection',async()=>{
 const corrupt=await recoveryFixture();corrupt.documents[0].fields={changed:{stringValue:'changed'}}
 const f=memory();await assert.rejects(rehearseIsolatedRestore(corrupt,{...recoveryOptions,fetcher:f.fetcher}),/isolated-restore-refused/);assert.equal(f.calls.length,0)
 for(const bad of [{integerValue:1},{integerValue:'9223372036854775808'},{integerValue:'01'},{stringValue:'x',integerValue:'1'},{booleanValue:'true'},{nullValue:false},{unknownValue:'x'},{bytesValue:'not base64!'},{timestampValue:'2026-02-30T00:00:00Z'},{timestampValue:'2020-01-01T11:59:59.123456789Z'},{mapValue:{fields:{__reserved__:{stringValue:'invalid'}}}},{referenceValue:'projects/other/databases/(default)/documents/games/g1'},{geoPointValue:{latitude:91,longitude:0}},{arrayValue:{values:[{arrayValue:{}}]}}]){
  const m=memory();await assert.rejects(rehearseIsolatedRestore(await recoveryFixture({bad}),{...recoveryOptions,fetcher:m.fetcher}),/isolated-restore-refused/);assert.equal(m.calls.length,0)
 }
})
test('packet ceiling is checked offline before any target request',async()=>{
 const f=memory();await assert.rejects(rehearseIsolatedRestore(await recoveryFixture({large:{stringValue:'x'.repeat(600000)},other:{stringValue:'y'.repeat(600000)}}),{...recoveryOptions,fetcher:f.fetcher}),/isolated-restore-refused/);assert.equal(f.calls.length,0)
})
test('nonempty or invalid inspection cannot proceed to commit',async()=>{
 for(const mode of ['not-empty','bad-inspection']){const f=memory(mode);await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:f.fetcher}),/isolated-restore-refused/);assert.deepEqual(f.calls.map(c=>c.op),['listCollectionIds']);assert.equal(f.docs.size,0)}
})
test('successful rehearsal verifies all raw fields, preserving int64, stored microseconds, references, blobs and nested values',async()=>{
 const f=memory(),result=await rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:f.fetcher})
 assert.equal(result.verifiedDocuments,4);assert.equal(result.productionRestoreSupported,false);assert.deepEqual(f.calls.map(c=>c.op),['listCollectionIds','commit','batchGet'])
 const game=[...f.docs].find(([name])=>name.endsWith('/games/g1'))[1]
 assert.equal(game.large.integerValue,'9223372036854775807');assert.equal(game.at.timestampValue,'2020-01-01T11:59:59.123456Z')
})
test('concurrent conflict is a rejected commit with no retries or partial harness writes',async()=>{
 const f=memory('collision');await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:f.fetcher}),/^Error: isolated-restore-commit-rejected$/)
 assert.equal(f.calls.length,2);assert.equal(f.docs.size,1);assert.deepEqual([...f.docs.values()][0],{sentinel:{stringValue:'preserved'}})
})
test('ambiguous or malformed commit acknowledgment never claims no writes and never retries',async()=>{
 for(const mode of ['ambiguous','bad-receipt']){const f=memory(mode);await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:f.fetcher}),/^Error: isolated-restore-outcome-unknown$/);assert.equal(f.calls.length,2);assert.equal(f.docs.size,4)}
})
test('readback mismatch is unverified, without automatic rollback or deletion',async()=>{
 const f=memory('bad-readback');await assert.rejects(rehearseIsolatedRestore(await recoveryFixture(),{...recoveryOptions,fetcher:f.fetcher}),/^Error: isolated-restore-verification-failed$/);assert.equal(f.calls.length,3);assert.equal(f.docs.size,4)
})
test('snapshot is detached before await/transport so caller mutation cannot change restored payload',async()=>{
 const input=await recoveryFixture(),f=memory(undefined,()=>{input.documents[0].fields={unexpected:{stringValue:'changed'}}})
 assert.equal((await rehearseIsolatedRestore(input,{...recoveryOptions,fetcher:f.fetcher})).verifiedDocuments,4)
 assert.equal([...f.docs.values()].some(fields=>'unexpected' in fields),false)
})
