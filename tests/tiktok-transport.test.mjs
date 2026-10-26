import test from 'node:test'
import assert from 'node:assert/strict'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
import {createWorkerFetch} from '../server/runtime/worker-fetch.ts'
import {createTikTokBackoff} from '../server/videos/tiktok-availability.ts'
const url='https://www.tiktok.com/@fixture/video/123456789',valid={type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789'}
test('TikTok identifies the application honestly with JSON accept and no forwarded visitor headers in Workers transport',async()=>{
 let calls=0;const verify=createTikTokVerifier(createWorkerFetch(async(endpoint,options)=>{
  calls++;assert.equal(endpoint.origin+endpoint.pathname,'https://www.tiktok.com/oembed');assert.equal(endpoint.searchParams.get('url'),url)
  const headers=new Headers(options.headers);assert.deepEqual([...headers.keys()],['accept','user-agent']);assert.equal(headers.get('accept'),'application/json');assert.equal(headers.get('user-agent'),'Clipzone/1.0 (+https://www.clipzone.workers.dev)')
  assert.equal(options.redirect,'manual');assert.equal(options.cache,'no-store');assert.ok(options.signal);return Response.json(valid)
 }))
 assert.equal((await verify({url})).existence,'confirmed');assert.equal(calls,1)
})
test('identified client still honors 429 and Retry-After without retry, cache of positive evidence or publication permission',async()=>{
 let time=1900000000000,calls=0;const backoff=createTikTokBackoff(()=>time)
 const verify=createTikTokVerifier(async()=>{calls++;return new Response(null,{status:429,headers:{'Retry-After':'120'}})},undefined,backoff)
 assert.equal((await verify({url})).unavailableReason,'provider-rate-limited');assert.equal(calls,1)
 await verify({url});assert.equal(calls,1);time+=120000;await verify({url});assert.equal(calls,2)
})
test('identification does not relax invalid/mismatched evidence or follow redirects',async()=>{
 for(const response of [()=>Response.json({...valid,embed_product_id:'wrong'}),()=>Response.json({...valid,provider_name:'Other'}),()=>new Response(null,{status:200}),()=>new Response(null,{status:302,headers:{Location:'https://evil.test/'}})]){
  let calls=0;const verify=createTikTokVerifier(createWorkerFetch(async()=>{calls++;return response()}));assert.equal((await verify({url})).existence,'unknown');assert.equal(calls,1)
 }
})
