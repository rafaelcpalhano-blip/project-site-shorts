import test from 'node:test'
import assert from 'node:assert/strict'
import {extractSharedVideoUrl,sharedVideoInput} from '../src/lib/validation/shared-video-url.ts'
import {resolveSharedVideoUrl} from '../server/videos/resolve-shared-url.ts'
import {createVideoLinkClient} from '../src/features/submissions/services/video-link-api.ts'
import {createVideoPreviewClient} from '../src/features/submissions/services/video-preview-api.ts'
import {createSubmissionClient} from '../src/features/submissions/services/submission-api.ts'
import {handleVideoPreview} from '../server/http/video-preview.ts'
import {handleSubmission} from '../server/http/submissions.ts'
const short='https://vt.tiktok.com/ZSg9fB79B/',full='https://www.tiktok.com/@seda_king/video/7476924359467207942'
const twitch='https://www.twitch.tv/grungetv_/clip/PreciousCourteousMonitorHumbleLife-DiK3axryzLGPyBA'
const origin='https://clipzone.test',signal=()=>new AbortController().signal
const evidence={existence:'confirmed',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[],formatPolicy:'tiktok-platform-exception',channelName:'SedaKing'}
const req=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
const deps={origin,resolveVisitor:async()=>'a'.repeat(64),checkAbuse:async()=>{},verify:async()=>evidence,resolveUrl:value=>resolveSharedVideoUrl(value,async()=>new Response(null,{status:301,headers:{location:full+'?tracking=x'}}))}

test('extract one supported link from share prose, newline, markdown and punctuation; keep YouTube link',()=>{
 for(const text of ['Confira este clipe! grungetv_ está em live Enshrouded! '+twitch,'Confira!\n'+twitch,'['+twitch+']('+twitch+')']){
  if(text.startsWith('['))assert.equal(extractSharedVideoUrl(text),text)
  else assert.equal(extractSharedVideoUrl(text),twitch)
 }
 assert.equal(extractSharedVideoUrl('Veja ('+short+').'),short)
 const youtube='https://www.youtube.com/shorts/abcdefghijk?si=x';assert.equal(extractSharedVideoUrl(youtube),youtube)
 for(const text of [twitch+' '+short,'https://evil.test '+short,'Confira https://twitch.tv.evil.test/a','sem link'])assert.equal(extractSharedVideoUrl(text),text)
})

test('recognize only official short shapes, HTTPS without credentials or port',()=>{
 for(const url of [short,'https://vm.tiktok.com/ABC123/','https://www.tiktok.com/t/ABC123/'])assert.equal(sharedVideoInput(url).short,true)
 for(const url of ['http://vt.tiktok.com/ABC/','https://vt.tiktok.com.evil.test/ABC/','https://user@vt.tiktok.com/ABC/','https://vt.tiktok.com:8080/ABC/','https://vt.tiktok.com/','https://www.tiktok.com/login'])assert.throws(()=>sharedVideoInput(url))
})

test('resolve redirects manually and return canonical video before fetching its HTML',async()=>{
 const calls=[];assert.equal(await resolveSharedVideoUrl(short,async(url,options)=>{calls.push(url);assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.ok(options.signal);return new Response(null,{status:302,headers:{location:calls.length===1?'https://vm.tiktok.com/ABC123/':full+'?tracking=x'}})}),full);assert.equal(calls.length,2)
 assert.equal(await resolveSharedVideoUrl(full,async()=>assert.fail('no fetch')),full)
})

test('reject external/private/nonvideo redirects before fetching them; bound loops and fail on unavailable links',async()=>{
 for(const target of ['http://www.tiktok.com/@seda_king/video/1','https://127.0.0.1/private','https://evil.test/video','https://www.tiktok.com/login','https://www.tiktok.com/@seda_king','https://clips.twitch.tv/Other','https://user@www.tiktok.com/@seda_king/video/1','https://www.tiktok.com:8080/@seda_king/video/1']){
  let calls=0;await assert.rejects(resolveSharedVideoUrl(short,async()=>{calls++;return new Response(null,{status:302,headers:{location:target}})}));assert.equal(calls,1)
 }
 let calls=0;await assert.rejects(resolveSharedVideoUrl(short,async()=>{calls++;return new Response(null,{status:301,headers:{location:short}})}));assert.equal(calls,4)
 for(const fetcher of [async()=>new Response(null,{status:200}),async()=>new Response(null,{status:404}),async()=>new Response(null,{status:302}),async()=>{throw Error('timeout')}])await assert.rejects(resolveSharedVideoUrl(short,fetcher))
})

test('resolve endpoint shares preview protections and does not fetch metadata or reserve video',async()=>{
 let calls=0;const local={...deps,resolveUrl:async()=>{calls++;return full},verify:async()=>assert.fail('no metadata for resolve')}
 const response=await handleVideoPreview(req('/api/shorts/resolve',{url:short}),local);assert.equal(response.status,200);assert.deepEqual(await response.json(),{url:full});assert.equal(calls,1)
 for(const patch of [{resolveVisitor:async()=>null},{checkAbuse:async()=>{throw Error('limited')}}])assert.notEqual((await handleVideoPreview(req('/api/shorts/resolve',{url:short}),{...local,...patch})).status,200)
 for(const body of [{url:'https://evil.test'},{url:short,gameId:'forged'}])assert.equal((await handleVideoPreview(req('/api/shorts/resolve',body),local)).status,400)
 assert.equal((await handleVideoPreview(req('/api/shorts/resolve',{url:short},{origin:'https://evil.test'}),local)).status,403);assert.equal(calls,1)
})

test('short preview resolves first and fills channel; failed/malicious resolution never reaches preview or submission',async()=>{
 const calls=[],fetcher=async(path,options)=>{calls.push(path);return path==='/api/session'?new Response(null,{status:204}):handleVideoPreview(new Request(origin+path,{...options,headers:{...options.headers,origin}}),deps)}
 assert.deepEqual(await createVideoPreviewClient(fetcher)(short,signal()),{title:null,channelName:'@seda_king'});assert.deepEqual(calls,['/api/session','/api/shorts/resolve','/api/session','/api/shorts/preview'])
 for(const body of [{url:'https://evil.test'},{url:'https://clips.twitch.tv/Test'},{}])await assert.rejects(createVideoLinkClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json(body))(short,signal()))
 let count=0;await assert.rejects(createSubmissionClient(async path=>{count++;return path==='/api/session'?new Response(null,{status:204}):new Response(null,{status:503})})({url:short,gameId:'game',title:'Meu título',channelName:'Manual'}));assert.equal(count,2)
 const abort=new AbortController();abort.abort();await assert.rejects(createVideoLinkClient(async(_,options)=>{options.signal.throwIfAborted()})(short,abort.signal))
})

test('short submission uses canonical identity, preserves manual fields and checks duplicate without repeating writes',async()=>{
 const records=new Map([['games/game',{status:'active'}]]),bodies=[]
 const store={transact:async work=>work({get:async path=>records.get(path)??null,create:(path,data)=>records.set(path,data),set:(path,data)=>records.set(path,data)})}
 const send=createSubmissionClient(async(path,options)=>{
  if(path==='/api/session')return new Response(null,{status:204})
  if(path==='/api/shorts/resolve')return handleVideoPreview(req(path,JSON.parse(options.body)),deps)
  bodies.push(JSON.parse(options.body));return handleSubmission(req(path,bodies.at(-1)),{...deps,store,now:()=>new Date('2026-10-24T15:00:00Z')})
 })
 const result=await send({url:short,gameId:'game',title:'Meu título',channelName:'Manual'})
 assert.equal(result.status,'published');assert.deepEqual(bodies[0],{url:full,gameId:'game',title:'Meu título',channelName:'Manual'})
 const saved=records.get('shorts/'+result.id);assert.equal(saved.normalizedUrl,full);assert.equal(saved.title,'Meu título');assert.equal(saved.channelName,'Manual')
 await assert.rejects(send({url:full,gameId:'game',title:'Outro',channelName:''}),/já foi enviado/);assert.equal([...records.keys()].filter(key=>key.startsWith('shorts/')).length,1)
})
