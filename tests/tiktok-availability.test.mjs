import {createVideoPreviewVerifier} from '../server/videos/preview.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createTikTokBackoff} from '../server/videos/tiktok-availability.ts'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
import {createConfiguredVideoVerifier} from '../server/videos/configured.ts'
import {decidePublication} from '../server/submissions/decision.ts'
import {handleSubmission} from '../server/http/submissions.ts'
import {handleVideoPreview} from '../server/http/video-preview.ts'
import {createVideoPreviewClient,SourceRateLimitError} from '../src/features/submissions/services/video-preview-api.ts'
import {createSubmissionClient} from '../src/features/submissions/services/submission-api.ts'
const url='https://www.tiktok.com/@fixture/video/123456789',origin='https://clipzone.example'
const provider={type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789'}
const unknown={existence:'unknown',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[]}
const limited={...unknown,unavailableReason:'provider-rate-limited',retryAfterSeconds:120}
const input={url,gameId:'game',title:'Escolha do usuário',channelName:'Canal'}
const request=(path,body)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
const deps={origin,resolveVisitor:async()=> 'a'.repeat(64),checkAbuse:async()=>{},verify:async()=>limited,now:()=>new Date(1900000000000),store:{transact:async()=>assert.fail('unverified attempt must not reserve video or publication quota')}}

test('TikTok negative availability respects Retry-After seconds/date, expires and never shortens an existing wait',()=>{
 let clock=1900000000000;const backoff=createTikTokBackoff(()=>clock)
 assert.equal(backoff.remainingSeconds(),0);assert.equal(backoff.defer('120'),120)
 clock+=1000;assert.equal(backoff.remainingSeconds(),119);assert.equal(backoff.defer('1'),119)
 clock+=119000;assert.equal(backoff.remainingSeconds(),0)
 assert.equal(backoff.defer(new Date(clock+180000).toUTCString()),180)
 clock+=180000;assert.equal(backoff.remainingSeconds(),0)
 for(const value of [null,'','private-response','-10','NaN','x'.repeat(1000)]){const isolated=createTikTokBackoff(()=>clock);assert.equal(isolated.defer(value),60)}
 assert.equal(createTikTokBackoff(()=>clock).defer('0'),1)
 assert.throws(()=>createTikTokBackoff(()=>NaN).remainingSeconds())
})

test('TikTok 429 cancels private body, performs no retry and keeps eligibility unconfirmed',async()=>{
 let clock=1900000000000,calls=0,cancelled=false;const backoff=createTikTokBackoff(()=>clock)
 const first=createTikTokVerifier(async()=>{calls++;return new Response(new ReadableStream({cancel(){cancelled=true}}),{status:429,headers:{'Retry-After':'120'}})},undefined,backoff)
 const result=await first({url});assert.equal(calls,1);assert.equal(cancelled,true)
 assert.deepEqual(result,limited);assert.equal(decidePublication(result,'TikTok').status,'retry');assert.equal(decidePublication(result,'TikTok').reason,'source-rate-limited')
 const recreated=createTikTokVerifier(async()=>{calls++;return Response.json(provider)},undefined,backoff)
 assert.equal((await recreated({url})).existence,'unknown');assert.equal(calls,1)
 clock+=120000;const recovered=await recreated({url});assert.equal(calls,2);assert.equal(recovered.existence,'confirmed');assert.equal(recovered.unavailableReason,undefined)
 assert.equal(decidePublication(recovered,'TikTok').status,'published')
})

test('shared Workers backoff does not retain the previous request transport or a positive video verdict',async()=>{
 let clock=1900000000000;const backoff=createTikTokBackoff(()=>clock),calls=[]
 const verify=(name,response)=>createConfiguredVideoVerifier({tiktokBackoff:backoff,fetcher:async()=>{calls.push(name);return response()}})
 assert.equal((await verify('first',()=>new Response(null,{status:429}))({url,gameId:'game'})).existence,'unknown')
 assert.equal((await verify('second',()=>assert.fail('must wait'))({url,gameId:'game'})).existence,'unknown')
 clock+=61000;assert.equal((await verify('third',()=>Response.json(provider))({url,gameId:'game'})).existence,'confirmed')
 assert.equal((await verify('fourth',()=>new Response(null,{status:404}))({url,gameId:'game'})).existence,'unknown')
 assert.deepEqual(calls,['first','third','fourth'])
})

test('a TikTok rate limit blocks publication and quota spend, while URL-only preview remains available',async()=>{
 let attempts=0;const dependencies={...deps,checkAbuse:async()=>{attempts++}}
 const sent=await handleSubmission(request('/api/shorts',input),dependencies)
 assert.equal(sent.status,503);assert.equal(sent.headers.get('retry-after'),'120');assert.equal(sent.headers.get('cache-control'),'no-store')
 const body=await sent.json();assert.equal(body.error,'source-rate-limited');assert.match(body.message,/cota de publicações/);assert.equal(body.id,undefined)
 const preview=await handleVideoPreview(request('/api/shorts/preview',{url}),dependencies)
 assert.equal(preview.status,200);assert.equal(preview.headers.get('retry-after'),null);assert.deepEqual(await preview.json(),{title:null,channelName:'@fixture'});assert.equal(attempts,2)
})

test('client cannot inject a trusted source verdict or retry delay, and rejected origins still bypass no checks',async()=>{
 let calls=0;const dependencies={...deps,verify:async()=>{calls++;return limited}}
 for(const extra of [{unavailableReason:'provider-rate-limited'},{retryAfterSeconds:1},{existence:'confirmed'}])assert.equal((await handleSubmission(request('/api/shorts',{...input,...extra}),dependencies)).status,400)
 const hostile=request('/api/shorts',input);hostile.headers.set('Origin','https://evil.example');assert.equal((await handleSubmission(hostile,dependencies)).status,403)
 assert.equal(calls,0)
 const isolated=createTikTokBackoff(()=>1900000000000);isolated.defer('120');let outbound=0
 const verify=createTikTokVerifier(async()=>{outbound++;return Response.json(provider)},undefined,isolated)
 await verify({url:'https://evil.example/video/123'});await verify({url:'https://clips.twitch.tv/SomeClip'});assert.equal(outbound,0)
})

test('source rate limits do not mislabel other providers and malformed delay values never become response headers',async()=>{
 for(const delay of [NaN,Infinity,-1,0,'120','\r\nprivate-header']){
  const dependencies={...deps,verify:async()=>({...limited,retryAfterSeconds:delay})}
  const response=await handleSubmission(request('/api/shorts',input),dependencies)
  assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),null)
 }
 assert.equal(decidePublication(limited,'YouTube').reason,'verification-incomplete')
 assert.equal(decidePublication(limited,'Twitch').reason,'verification-incomplete')
})

test('preview client distinguishes TikTok rate limiting without exposing provider payload or retrying',async()=>{
 const calls=[];const preview=createVideoPreviewClient(async(path)=>{calls.push(path);return path==='/api/session'?new Response(null,{status:204}):Response.json({error:'source-rate-limited',message:'private provider body'},{status:503})})
 await assert.rejects(preview(url,new AbortController().signal),error=>error instanceof SourceRateLimitError&&!error.message.includes('private provider body')&&error.message.includes('não libera'))
 assert.deepEqual(calls,['/api/session','/api/shorts/preview'])
})

test('submission client shows upstream availability rather than a user quota error and never retries writes',async()=>{
 const calls=[];const client=createSubmissionClient(async(path)=>{calls.push(path);return path==='/api/session'?new Response(null,{status:204}):Response.json({error:'source-rate-limited',message:'private provider body'},{status:503})})
 await assert.rejects(client(input),error=>/TikTok/.test(error.message)&&/cota de publicações/.test(error.message)&&!error.message.includes('private provider body'))
 assert.deepEqual(calls,['/api/session','/api/shorts'])
})

test('optional profile 429 cancels its body and shares negative wait with video verification without downgrading confirmed metadata',async()=>{
 let clock=1900000000000,cancelled=false,profileCalls=0,videoCalls=0;const backoff=createTikTokBackoff(()=>clock)
 const original={...unknown,existence:'confirmed',formatPolicy:'tiktok-platform-exception'}
 const preview=createVideoPreviewVerifier(async()=>original,async()=>{profileCalls++;return new Response(new ReadableStream({cancel(){cancelled=true}}),{status:429,headers:{'Retry-After':'90'}})},backoff)
 assert.equal((await preview({url,gameId:'game'})).existence,'confirmed');assert.equal(profileCalls,1);assert.equal(cancelled,true)
 const video=createTikTokVerifier(async()=>{videoCalls++;return Response.json(provider)},undefined,backoff)
 assert.equal((await video({url})).unavailableReason,'provider-rate-limited');assert.equal(videoCalls,0)
 await preview({url,gameId:'game'});assert.equal(profileCalls,1)
 clock+=90000;assert.equal((await video({url})).existence,'confirmed');assert.equal(videoCalls,1)
})
