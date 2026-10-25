import test from 'node:test'
import assert from 'node:assert/strict'
import {createOutboundBudget,OutboundBudgetError} from '../server/runtime/outbound-budget.ts'
const url='https://fixture.example.test/'
test('invalid limits rejected without network',()=>{for(const options of [{maximum:0},{maximum:NaN},{maximum:3,cleanupReserve:3},{maximum:3,cleanupReserve:-1},{maximum:3.5}])assert.throws(()=>createOutboundBudget(options))})
test('ordinary dispatch stops before reserve; cleanup shares the same hard ceiling',async()=>{
 let calls=0;const budget=createOutboundBudget({maximum:3,fetcher:async()=>{calls++;return new Response('ok')}})
 await budget.fetch(url);await budget.fetch(url)
 await assert.rejects(budget.fetch(url),OutboundBudgetError);assert.equal(calls,2)
 await budget.cleanupFetch(url);await assert.rejects(budget.cleanupFetch(url),OutboundBudgetError)
 assert.equal(calls,3);assert.deepEqual(budget.usage(),{dispatched:3,remaining:0,ordinaryRemaining:0})
})
test('concurrent dispatch cannot overshoot while transports are still waiting',async()=>{
 let release,calls=0;const gate=new Promise(resolve=>{release=resolve})
 const budget=createOutboundBudget({maximum:3,cleanupReserve:0,fetcher:async()=>{calls++;await gate;return new Response('ok')}})
 const pending=Array.from({length:8},()=>budget.fetch(url));release()
 const results=await Promise.allSettled(pending)
 assert.equal(results.filter(row=>row.status==='fulfilled').length,3);assert.equal(calls,3);assert.equal(budget.usage().remaining,0)
})
test('HTTP error and rejected transport consume budget; no implicit retry or refund',async()=>{
 let calls=0;const budget=createOutboundBudget({maximum:3,cleanupReserve:0,fetcher:async()=>{calls++;if(calls===1)throw Error('private-detail');return new Response('failure',{status:503})}})
 await assert.rejects(budget.fetch(url));assert.equal((await budget.fetch(url)).status,503);assert.equal(budget.usage().dispatched,2);assert.equal(calls,2)
})
test('redirects default to error; explicit manual dispatch counts; follow is refused before network',async()=>{
 const policies=[],budget=createOutboundBudget({maximum:4,fetcher:async(_url,init)=>{policies.push(init.redirect);return new Response(null,{status:302,headers:{Location:'/next'}})}})
 await budget.fetch(url);await budget.fetch(url,{redirect:'manual'})
 await assert.rejects(budget.fetch(url,{redirect:'follow'}),/automatic-redirect/)
 await assert.rejects(budget.fetch(new Request(url)),/automatic-redirect/)
 assert.deepEqual(policies,['error','manual']);assert.equal(budget.usage().dispatched,2)
})
test('pre-aborted call is not dispatched or charged',async()=>{
 let calls=0;const budget=createOutboundBudget({maximum:2,fetcher:async()=>{calls++;return new Response()}})
 const controller=new AbortController();controller.abort()
 await assert.rejects(budget.fetch(url,{signal:controller.signal}));assert.equal(calls,0);assert.equal(budget.usage().dispatched,0)
})
test('independent scopes never share counters and usage snapshots cannot reset a scope',async()=>{
 const options={maximum:2,fetcher:async()=>new Response()},one=createOutboundBudget(options),two=createOutboundBudget(options)
 await one.fetch(url);one.usage().dispatched=0
 await assert.rejects(one.fetch(url),OutboundBudgetError);assert.equal(two.usage().dispatched,0);await two.fetch(url)
})
