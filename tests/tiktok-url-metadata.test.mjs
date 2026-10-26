import test from 'node:test'
import assert from 'node:assert/strict'
import {handleVideoPreview} from '../server/http/video-preview.ts'
import {handleSubmission} from '../server/http/submissions.ts'
import {createConfiguredVideoVerifier} from '../server/videos/configured.ts'
import {resolveSharedVideoUrl} from '../server/videos/resolve-shared-url.ts'
const origin='https://clipzone.example',url='https://www.tiktok.com/@fixture.name/video/123456789'
const request=(path,body)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
const deps={origin,resolveVisitor:async()=>'a'.repeat(64),checkAbuse:async()=>{},verify:async()=>assert.fail('URL metadata cannot consult providers')}
test('automatic TikTok handle preview requires no provider, strips tracking and never claims verification',async()=>{
 const r=await handleVideoPreview(request('/api/shorts/preview',{url:url+'?q=tracking'}),deps)
 assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{title:null,channelName:'@fixture.name'})
})
test('short and full links reach exactly the same video verifier after canonical resolution',async()=>{
 const endpoints=[];let redirects=0
 const fetcher=async(input)=>{const endpoint=new URL(String(input));if(endpoint.hostname==='vt.tiktok.com'){redirects++;return new Response(null,{status:302,headers:{Location:url+'?tracking=x'}})}endpoints.push(endpoint.searchParams.get('url'));return Response.json({type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789'})}
 for(const input of [url+'?q=one','https://vt.tiktok.com/Fixture/']){
  const canonical=await resolveSharedVideoUrl(input,fetcher);assert.equal(canonical,url)
  const r=await handleVideoPreview(request('/api/shorts/preview',{url:canonical}),deps);assert.equal(r.status,200)
  const evidence=await createConfiguredVideoVerifier({fetcher})({url:canonical,gameId:'game'});assert.equal(evidence.existence,'confirmed')
 }
 assert.equal(redirects,1);assert.deepEqual(endpoints,[url,url])
})
test('automatic handle is untrusted metadata and cannot authorize missing, failed or mismatched video publication',async()=>{
 for(const provider of [()=>new Response(null,{status:429}),()=>new Response(null,{status:404}),()=>Response.json({type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'different'}),()=>{throw Error('private-provider-error')}]){
  const response=await handleSubmission(request('/api/shorts',{url,gameId:'game',channelName:'@fixture.name'}),{...deps,verify:createConfiguredVideoVerifier({fetcher:async()=>provider()}),now:()=>new Date(),store:{transact:async()=>assert.fail('no content/quota writes')}})
  assert.equal(response.status,503);assert.equal((await response.text()).includes('private-provider-error'),false)
 }
})
test('URL preview preserves origin/session/input and abuse guards and never changes other providers',async()=>{
 const foreign=request('/api/shorts/preview',{url});foreign.headers.set('Origin','https://evil.test');assert.equal((await handleVideoPreview(foreign,deps)).status,403)
 assert.equal((await handleVideoPreview(request('/api/shorts/preview',{url}),{...deps,resolveVisitor:async()=>null})).status,401)
 for(const body of [{url:'https://www.tiktok.com.evil.test/@x/video/1'},{url,existence:'confirmed'}])assert.equal((await handleVideoPreview(request('/api/shorts/preview',body),deps)).status,400)
 let guarded=0;assert.equal((await handleVideoPreview(request('/api/shorts/preview',{url}),{...deps,checkAbuse:async()=>{guarded++;throw Error('limited')}})).status,503);assert.equal(guarded,1)
 let verified=0;const r=await handleVideoPreview(request('/api/shorts/preview',{url:'https://clips.twitch.tv/Fixture'}),{...deps,verify:async()=>{verified++;return {existence:'confirmed',title:'Original'}}});assert.equal(r.status,200);assert.equal(verified,1)
})
