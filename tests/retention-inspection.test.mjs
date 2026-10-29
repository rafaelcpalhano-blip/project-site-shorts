import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectAuxiliaryRetention} from '../server/maintenance/inspect-retention.ts'
const at=Date.parse('2026-10-29T12:00:00Z'),day=86400000,id=n=>n.toString(16).padStart(64,'0'),row=(n,data)=>({id:id(n),data})
function fixture(rows){
 const calls=[],original=structuredClone(rows)
 const store={expiredNetworkRecords:async now=>{calls.push({collection:'networkAbuse',at:now.getTime()});return structuredClone(rows)},scanLikeRecords:async(collection,after)=>{calls.push({collection,after});return structuredClone(rows.filter(r=>!after||r.id>after).slice(0,30))}}
 Object.defineProperty(store,'transact',{get(){assert.fail('inspection must not even access a write capability')}})
 return {calls,rows,original,store,now:()=>new Date(at)}
}
const inspect=(collection,f,extra={})=>inspectAuxiliaryRetention({collection,...extra},f)
test('network inspection observes expired rows conservatively with no transaction, mutation or private payload output',async()=>{
 const f=fixture([row(1,{expiresAt:new Date(at-1),private:'must-not-be-returned'}),row(2,{expiresAt:new Date(at)}),row(3,{expiresAt:new Date(at+1)}),row(4,{expiresAt:'invalid'})]),r=await inspect('networkAbuse',f)
 assert.equal(r.eligible,2);assert.equal(r.examined,4);assert.equal(r.returnedDocuments,4);assert.equal(r.sourceQueries,1);assert.equal(r.deleted,0);assert.equal(r.next,null);assert.equal(r.continuationPossible,false);assert.equal(r.scope,'first-expired-window');assert.equal(f.calls.length,1);assert.deepEqual(f.rows,f.original);assert.ok(!JSON.stringify(r).includes('must-not-be-returned'));assert.ok(!JSON.stringify(r).includes(id(1)))
})
test('likes inspection reuses ninety-day rules, preserving active, recent, boundary and malformed records',async()=>{
 const like=(liked,changedAt,extra={})=>({shortId:'s1',liked,createdAt:new Date(changedAt-1),changedAt:new Date(changedAt),revision:1,...extra}),f=fixture([row(1,like(false,at-91*day)),row(2,like(true,at-200*day)),row(3,like(false,at-89*day)),row(4,like(false,at-90*day)),row(5,{liked:false,changedAt:new Date(at-200*day)})]),r=await inspect('shortLikes',f)
 assert.equal(r.eligible,1);assert.equal(r.deleted,0);assert.equal(f.calls.length,1);assert.deepEqual(f.rows,f.original)
})
test('attempt inspection rejects malformed and recent records without confusing them with expired counters',async()=>{
 const attempt=(offset,count=1)=>({count,startsAt:new Date(at-offset*day-1000),updatedAt:new Date(at-offset*day)}),f=fixture([row(1,attempt(91)),row(2,attempt(90)),row(3,attempt(1)),row(4,attempt(100,-1))]);assert.equal((await inspect('likeAttempts',f)).eligible,1);assert.deepEqual(f.rows,f.original)
})
test('selection cannot include primary/ranking collections, apply mode or configurable limits; rejects before any query',async()=>{
 const f=fixture([])
 for(const input of [null,[],{}, {collection:'shorts'},{collection:'rankingItems'},{collection:'networkAbuse',apply:false},{collection:'shortLikes',apply:true},{collection:'likeAttempts',maximumRecords:100},{collection:{toString(){assert.fail('must not coerce selection')}}},{collection:'networkAbuse',after:id(1)},{collection:'shortLikes',after:'../private'}])await assert.rejects(inspectAuxiliaryRetention(input,f),/invalid-retention-inspection/)
 assert.equal(f.calls.length,0)
})
test('a full likes page returns an opaque continuation but never follows it automatically',async()=>{
 const f=fixture(Array.from({length:31},(_,i)=>row(i+1,{count:0,startsAt:new Date(at-100*day),updatedAt:new Date(at-100*day)}))),first=await inspect('likeAttempts',f)
 assert.equal(first.returnedDocuments,30);assert.equal(first.examined,30);assert.equal(first.eligible,30);assert.equal(first.next,id(30));assert.equal(first.continuationPossible,true);assert.equal(f.calls.length,1)
 const last=await inspect('likeAttempts',f,{after:first.next});assert.equal(last.examined,1);assert.equal(last.next,null);assert.equal(f.calls.length,2);assert.deepEqual(f.rows,f.original)
})
test('network full window is explicitly partial and cannot pretend to enumerate all expired records',async()=>{
 const f=fixture(Array.from({length:30},(_,i)=>row(i,{expiresAt:new Date(at-1)}))),r=await inspect('networkAbuse',f);assert.equal(r.continuationPossible,true);assert.equal(r.next,null);assert.equal(r.scope,'first-expired-window');assert.equal(f.calls.length,1)
})
test('excess, duplicate, malformed and unordered pages fail closed with fixed errors',async()=>{
 for(const rows of [Array.from({length:31},(_,i)=>row(i,{})),[row(1,{}),row(1,{})],[{id:'../x',data:{}}],[row(1,null)]])await assert.rejects(inspect('networkAbuse',fixture(rows)),/^Error: retention-inspection-unavailable$/)
 const f=fixture([row(2,{}),row(1,{})]);await assert.rejects(inspect('shortLikes',f),/retention-inspection-unavailable/)
})
test('source failures and missing adapters do not disclose their private errors or try another source',async()=>{
 for(const collection of ['networkAbuse','shortLikes','likeAttempts']){
  const fail=async()=>{throw Error('fixture-private-credential')},f={store:{expiredNetworkRecords:fail,scanLikeRecords:fail},now:()=>new Date(at)};await assert.rejects(inspect(collection,f),e=>e.message==='retention-inspection-unavailable'&&!e.message.includes('credential'))
  await assert.rejects(inspect(collection,{store:{},now:()=>new Date(at)}),/retention-inspection-unavailable/)
 }
})
test('invalid clock and cancellation before or after reading never produce a successful report',async()=>{
 const f=fixture([]);await assert.rejects(inspect('networkAbuse',{...f,now:()=>new Date(NaN)}),/invalid-retention-inspection/);assert.equal(f.calls.length,0)
 const before=new AbortController();before.abort('private-reason');await assert.rejects(inspect('shortLikes',{...f,signal:before.signal}),/retention-inspection-aborted/);assert.equal(f.calls.length,0)
 const during=new AbortController(),store={expiredNetworkRecords:async()=>{during.abort('private-reason');return []}};await assert.rejects(inspect('networkAbuse',{store,now:f.now,signal:during.signal}),/retention-inspection-aborted/)
})
test('clock and selected collection are captured before awaiting; subsequent input edits cannot select another source',async()=>{
 let clock=at,release;const input={collection:'networkAbuse'},f=fixture([row(1,{expiresAt:new Date(at+1)})]),query=f.store.expiredNetworkRecords
 f.now=()=>new Date(clock);f.store.expiredNetworkRecords=async now=>{await new Promise(r=>{release=r});return query(now)}
 const pending=inspectAuxiliaryRetention(input,f);input.collection='shorts';clock+=day;release();const r=await pending;assert.equal(r.collection,'networkAbuse');assert.equal(r.observedAt,new Date(at).toISOString());assert.equal(r.eligible,0);assert.equal(f.calls.length,1)
})
test('empty and repeated inspections stay read-only and report source queries separately from billed reads',async()=>{
 const f=fixture([]),a=await inspect('shortLikes',f),b=await inspect('shortLikes',f);assert.deepEqual(a,b);assert.equal(a.examined,0);assert.equal(a.sourceQueries,1);assert.equal(a.returnedDocuments,0);assert.equal(a.deleted,0);assert.ok(!Object.hasOwn(a,'billedReads'));assert.equal(f.calls.length,2)
})
