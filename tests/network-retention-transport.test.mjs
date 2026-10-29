import test from 'node:test'
import assert from 'node:assert/strict'
import {createNetworkRetentionInspection} from '../server/maintenance/network-inspection-transport.ts'
const at=new Date('2026-10-29T12:00:00Z'),root='projects/clipzone-db02a/databases/(default)/documents',id=n=>n.toString(16).padStart(64,'0')
const frame=(n=1,expires=new Date(at-1).toISOString())=>({document:{name:root+'/networkAbuse/'+id(n),fields:{expiresAt:{timestampValue:expires}}},readTime:at.toISOString()})
function fixture(fetcher=async()=>Response.json([frame()]),token='fixture-token'){
 let requests=0,tokens=0;const ctl=new AbortController(),calls=[]
 const run=createNetworkRetentionInspection({signal:ctl.signal,now:()=>at,getAccessToken:async signal=>{tokens++;assert.ok(!signal.aborted);return token},fetcher:async(url,init)=>{requests++;calls.push({url,init});return fetcher(url,init)}})
 return {run,ctl,calls,requests:()=>requests,tokens:()=>tokens}
}
test('fixed target, expiry-only projection and one page produce counts without identifiers or writes',async()=>{
 const f=fixture(),r=await f.run(),{url,init}=f.calls[0],body=JSON.parse(init.body)
 assert.equal(url,'https://firestore.googleapis.com/v1/'+root+':runQuery');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.headers.Authorization,'Bearer fixture-token');assert.deepEqual(Object.keys(body),['structuredQuery']);assert.deepEqual(body.structuredQuery.from,[{collectionId:'networkAbuse'}]);assert.deepEqual(body.structuredQuery.select.fields,[{fieldPath:'expiresAt'}]);assert.equal(body.structuredQuery.limit,30);assert.equal(body.structuredQuery.where.fieldFilter.op,'LESS_THAN_OR_EQUAL');assert.equal(body.structuredQuery.where.fieldFilter.value.timestampValue,at.toISOString());assert.equal(r.eligible,1);assert.equal(r.deleted,0);assert.equal(r.httpRequests,1);assert.equal(r.responseByteCeiling,131072);assert.equal(f.requests(),1);assert.equal(f.tokens(),1);assert.ok(!JSON.stringify(r).includes(id(1)));assert.ok(!JSON.stringify(r).includes('fixture-token'))
})
test('constructor is inert; single use is enforced after success and on concurrent calls',async()=>{
 const f=fixture();assert.equal(f.requests(),0);assert.equal(f.tokens(),0)
 const [a,b]=await Promise.allSettled([f.run(),f.run()]);assert.equal(a.status,'fulfilled');assert.equal(b.status,'rejected');assert.equal(f.requests(),1);await assert.rejects(f.run(),/not-verified/);assert.equal(f.requests(),1)
})
test('failed invocation cannot retry or refund its consumed operation',async()=>{
 const f=fixture(async()=>{throw Error('private-provider-body')});await assert.rejects(f.run(),/^Error: network-retention-inspection-not-verified$/);await assert.rejects(f.run(),/not-verified/);assert.equal(f.requests(),1);assert.equal(f.tokens(),1)
})
test('HTTP refusal/redirect/MIME mismatch cancels body and exposes no provider payload',async()=>{
 for(const kind of ['429','403','500','redirect','mime']){
  let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true}}),response=new Response(stream,{status:kind==='redirect'?302:/^\d+$/.test(kind)?Number(kind):200,headers:{'Content-Type':kind==='mime'?'text/html':'application/json'}})
  const f=fixture(async()=>response);await assert.rejects(f.run(),e=>e.message==='network-retention-inspection-not-verified');assert.equal(cancelled,true);assert.equal(f.requests(),1)
 }
})
test('declared and streaming response ceilings stop before a report is released',async()=>{
 for(const length of ['131073','invalid']){const f=fixture(async()=>new Response('{}',{headers:{'Content-Type':'application/json','Content-Length':length}}));await assert.rejects(f.run(),/not-verified/)}
 let cancelled=false;const f=fixture(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(131073))},cancel(){cancelled=true}}),{headers:{'Content-Type':'application/json'}}));await assert.rejects(f.run(),/not-verified/);assert.equal(cancelled,true)
})
test('malformed JSON, excessive rows and wrong collection/project are refused',async()=>{
 for(const body of ['bad',{},Array.from({length:32},()=>({readTime:at.toISOString()})),[frame(1),frame(1)],[{...frame(),document:{...frame().document,name:root+'/shorts/'+id(1)}}],[{...frame(),document:{...frame().document,name:frame().document.name.replace('clipzone-db02a','other-project')}}]]){const f=fixture(async()=>typeof body==='string'?new Response(body,{headers:{'Content-Type':'application/json'}}):Response.json(body));await assert.rejects(f.run(),/not-verified/)}
})
test('extra projected fields, invalid/future expiry and unexpected metadata fail closed',async()=>{
 for(const body of [[{document:{...frame().document,fields:{...frame().document.fields,privateContent:{stringValue:'private'}}}}],[frame(1,'invalid')],[frame(1,new Date(at.getTime()+1).toISOString())],[{transaction:'unrequested'}],[{readTime:at.toISOString(),error:'private'}]]){const f=fixture(async()=>Response.json(body));await assert.rejects(f.run(),/not-verified/)}
})
test('empty and full pages are described without claiming total inventory or billed reads',async()=>{
 const empty=await fixture(async()=>Response.json([{readTime:at.toISOString()}])).run();assert.equal(empty.examined,0);assert.equal(empty.sourceQueries,1);assert.equal(empty.httpRequests,1);assert.ok(!Object.hasOwn(empty,'billedReads'))
 const full=await fixture(async()=>Response.json(Array.from({length:30},(_,i)=>frame(i)))).run();assert.equal(full.examined,30);assert.equal(full.continuationPossible,true);assert.equal(full.next,null)
})
test('invalid tokens and cancelled operations never reach Firestore',async()=>{
 for(const token of ['',null,'bad token','bad\r\nheader','x'.repeat(16385)]){const f=fixture(undefined,token);await assert.rejects(f.run(),/not-verified/);assert.equal(f.requests(),0)}
 const f=fixture();f.ctl.abort('private-cancel-reason');await assert.rejects(f.run(),/not-verified/);assert.equal(f.requests(),0);assert.equal(f.tokens(),0)
})
test('cancellation while waiting for a non-cooperative transport returns a fixed error without retry',async()=>{
 let resolve;const f=fixture(async()=>new Promise(r=>{resolve=r})),pending=f.run();while(!resolve)await new Promise(r=>setImmediate(r));f.ctl.abort('private-reason');await assert.rejects(pending,/not-verified/);assert.equal(f.requests(),1);resolve(Response.json([]));await assert.rejects(f.run(),/not-verified/)
})
test('errors from token acquisition are sanitized before any Firestore fetch',async()=>{
 const ctl=new AbortController();let fetches=0;const run=createNetworkRetentionInspection({signal:ctl.signal,now:()=>at,fetcher:async()=>{fetches++;assert.fail('must not fetch')},getAccessToken:async()=>{throw Error('fixture-secret-key')}});await assert.rejects(run(),e=>e.message==='network-retention-inspection-not-verified'&&!e.message.includes('secret'));assert.equal(fetches,0)
})
