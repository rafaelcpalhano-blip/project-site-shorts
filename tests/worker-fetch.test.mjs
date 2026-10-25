import test from 'node:test'
import assert from 'node:assert/strict'
import {createWorkerFetch} from '../server/runtime/worker-fetch.ts'
test('error policy is implemented with exactly one manual dispatch and cancels redirect body',async()=>{
 for(const status of [301,302,303,307,308]){
  let calls=0,cancelled=false
  const run=createWorkerFetch(async(_input,init)=>{calls++;assert.equal(init.redirect,'manual');assert.equal(new Headers(init.headers).get('authorization'),'Bearer fixture');return new Response(new ReadableStream({cancel(){cancelled=true}}),{status,headers:{Location:'https://other.test/private'}})})
  await assert.rejects(run('https://provider.test',{redirect:'error',headers:{Authorization:'Bearer fixture'}}),/redirect-not-permitted/);assert.equal(calls,1);assert.equal(cancelled,true)
 }
})
test('manual policy preserves redirects for existing explicit resolver loops',async()=>{
 const run=createWorkerFetch(async(_input,init)=>{assert.equal(init.redirect,'manual');return Response.redirect('https://other.test',302)})
 assert.equal((await run('https://provider.test',{redirect:'manual'})).status,302)
})
test('follow refuses transport; normal responses preserve status body and signal',async()=>{
 let calls=0;const signal=new AbortController().signal,run=createWorkerFetch(async(_input,init)=>{calls++;assert.equal(init.signal,signal);return Response.json({ok:true},{status:201})})
 await assert.rejects(run('https://provider.test',{redirect:'follow'}),/automatic-redirect/);assert.equal(calls,0)
 const response=await run('https://provider.test',{signal});assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true});assert.equal(calls,1)
})
