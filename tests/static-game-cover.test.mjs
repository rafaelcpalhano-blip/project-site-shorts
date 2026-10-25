import test from 'node:test'
import assert from 'node:assert/strict'
import {serveStaticGameCover} from '../server/runtime/static-game-cover.ts'
import {createWorkerEntry} from '../server/runtime/worker-entry.ts'
const url='https://clipzone.test/images/games/fixture.png'
test('preserves image bytes, cache, validators and range metadata',async()=>{
 for(const status of [200,206]){
  const response=await serveStaticGameCover(new Request(url),async()=>new Response(new Uint8Array([1,2,3]),{status,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=60',ETag:'"fixture"',...(status===206?{'Content-Range':'bytes 0-2/8'}:{})}}))
  assert.equal(response.status,status);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);assert.equal(response.headers.get('cache-control'),'public, max-age=60');assert.equal(response.headers.get('etag'),'"fixture"');assert.equal(response.headers.get('x-content-type-options'),'nosniff');if(status===206)assert.equal(response.headers.get('content-range'),'bytes 0-2/8')
 }
})
test('missing HTML and redirects cannot become successful cover responses; body cancelled',async()=>{
 for(const [status,type]of [[200,'text/html'],[404,'text/html'],[302,'image/png'],[200,'image/jpeg']]){
  let cancelled=false
  const body=new ReadableStream({cancel(){cancelled=true}})
  const response=await serveStaticGameCover(new Request(url),async()=>new Response(body,{status,headers:{'Content-Type':type}}))
  assert.equal(response.status,404);assert.equal(await response.text(),'');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(cancelled,true)
 }
})
test('unsafe paths and methods never call assets',async()=>{
 let calls=0;const assets=async()=>{calls++;return new Response()}
 for(const path of ['/images/games/a.svg','/images/games/%66.png','/images/games/sub/a.png','/images/games/'+ 'a'.repeat(101)+'.png'])assert.equal((await serveStaticGameCover(new Request('https://clipzone.test'+path),assets)).status,404)
 const response=await serveStaticGameCover(new Request(url,{method:'POST'}),assets);assert.equal(response.status,405);assert.equal(response.headers.get('allow'),'GET, HEAD');assert.equal(calls,0)
})
test('HEAD preserves length and cache metadata without forwarding a body',async()=>{
 const response=await serveStaticGameCover(new Request(url,{method:'HEAD'}),async request=>{assert.equal(request.method,'HEAD');return new Response(null,{headers:{'Content-Type':'image/png','Content-Length':'123',ETag:'"fixture"'}})})
 assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),'123');assert.equal(await response.text(),'')
})
test('conditional 304 preserved; unsolicited 304 rejected',async()=>{
 const assets=async()=>new Response(null,{status:304,headers:{ETag:'"fixture"'}})
 const response=await serveStaticGameCover(new Request(url,{headers:{'If-None-Match':'"fixture"'}}),assets)
 assert.equal(response.status,304);assert.equal(response.headers.get('etag'),'"fixture"');assert.equal(await response.text(),'')
 assert.equal((await serveStaticGameCover(new Request(url),assets)).status,404)
})
test('JPEG and WebP use their matching MIME types',async()=>{
 for(const [suffix,type]of [['jpg','image/jpeg'],['jpeg','image/jpeg'],['webp','image/webp']])assert.equal((await serveStaticGameCover(new Request(url.replace('png',suffix)),async()=>new Response('fixture',{headers:{'Content-Type':type}}))).status,200)
})
test('entry reserves cover namespace while pages and API retain their boundaries',async()=>{
 let api=0
 const entry=createWorkerEntry({origin:'https://clipzone.test',assets:async()=>new Response('SPA',{headers:{'Content-Type':'text/html'}}),trustedTransport:()=>({clientAddress:'203.0.113.10'}),createApi:async()=>async()=>{api++;return Response.json({error:'not-found'},{status:404})}})
 assert.equal((await entry(new Request(url))).status,404)
 assert.equal(await (await entry(new Request('https://clipzone.test/jogos/fixture'))).text(),'SPA')
 const response=await entry(new Request('https://clipzone.test/api/unknown'));assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'not-found'});assert.equal(api,1)
})
