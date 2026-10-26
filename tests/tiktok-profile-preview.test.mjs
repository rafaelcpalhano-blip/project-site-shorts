import test from 'node:test'
import assert from 'node:assert/strict'
import {tikTokProfileChannel} from '../server/videos/tiktok-profile.ts'
import {createVideoPreviewVerifier} from '../server/videos/preview.ts'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
import {handleVideoPreview} from '../server/http/video-preview.ts'
import {createVideoPreviewClient} from '../src/features/submissions/services/video-preview-api.ts'
const url='https://www.tiktok.com/@gamer/video/123456789?tracking=example'
const profile={version:'1.0',type:'rich',provider_name:'TikTok',provider_url:'https://www.tiktok.com/',author_url:'https://www.tiktok.com/@gamer',author_name:'Canal Ação 🎮'}
const evidence={existence:'confirmed',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[],formatPolicy:'tiktok-platform-exception'}

test('profile lookup uses one official canonical request, no redirects, finite timeout and matching author',async()=>{
 let calls=0
 assert.equal(await tikTokProfileChannel(url,async(endpoint,options)=>{calls++;assert.equal(endpoint.origin+endpoint.pathname,'https://www.tiktok.com/oembed');assert.equal(endpoint.searchParams.get('url'),'https://www.tiktok.com/@gamer');assert.equal(options.redirect,'error');assert.ok(options.signal);return Response.json({...profile,html:'<script>untrusted()</script>'})}),profile.author_name)
 assert.equal(calls,1)
})

test('invalid, foreign or absent author metadata fails softly; non-TikTok never fetches',async()=>{
 for(const patch of [{author_name:undefined},{author_name:42},{author_name:'x'.repeat(81)},{author_name:'bad\u0000name'},{author_url:'https://www.tiktok.com/@other'},{author_url:'https://www.tiktok.com.evil.test/@gamer'},{author_url:'https://x@www.tiktok.com/@gamer'},{author_url:'https://www.tiktok.com:8080/@gamer'},{author_url:'http://www.tiktok.com/@gamer'},{type:'video'},{version:'2.0'},{provider_name:'Other'},{provider_url:'https://evil.test'}])assert.equal(await tikTokProfileChannel(url,async()=>Response.json({...profile,...patch})),undefined)
 for(const fetcher of [async()=>new Response(null,{status:429}),async()=>{throw Error('secret')},async()=>new Response('invalid JSON')])assert.equal(await tikTokProfileChannel(url,fetcher),undefined)
 assert.equal(await tikTokProfileChannel('https://clips.twitch.tv/Test',async()=>{assert.fail('unexpected fetch')}),undefined)
})

test('enrichment only for confirmed TikTok with missing author; failures preserve original evidence',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json(profile)}
 for(const base of [{...evidence,channelName:'Existing'},{...evidence,existence:'unknown'},{...evidence,existence:'missing'}])assert.equal(await createVideoPreviewVerifier(async()=>base,fetcher)({url,gameId:'preview'}),base)
 assert.equal(await createVideoPreviewVerifier(async()=>evidence,fetcher)({url:'https://clips.twitch.tv/Test',gameId:'preview'}),evidence);assert.equal(calls,0)
 assert.deepEqual(await createVideoPreviewVerifier(async()=>evidence,fetcher)({url,gameId:'preview'}),{...evidence,channelName:profile.author_name});assert.equal(calls,1)
 assert.equal(await createVideoPreviewVerifier(async()=>evidence,async()=>{throw Error('offline')})({url,gameId:'preview'}),evidence)
 assert.equal(evidence.channelName,undefined)
})

test('automatic HTTP preview uses URL handle without network, while strict publication verifier still checks the video',async()=>{
 const endpoints=[],fetcher=async endpoint=>{endpoints.push(endpoint.searchParams.get('url'));return Response.json(endpoint.searchParams.get('url').includes('/video/')?{version:'1.0',type:'video',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789'}:profile)}
 const strict=createTikTokVerifier(fetcher),verify=createVideoPreviewVerifier(strict,fetcher),origin='https://clipzone.test'
 const load=createVideoPreviewClient(async(path,options)=>path==='/api/session'?new Response(null,{status:204}):handleVideoPreview(new Request(origin+path,{...options,headers:{...options.headers,origin}}),{origin,resolveVisitor:async()=>'a'.repeat(64),checkAbuse:async()=>{},verify}))
 assert.deepEqual(await load(url,new AbortController().signal),{title:null,channelName:'@gamer'})
 assert.deepEqual(endpoints,[]) // Profile and video validation are not needed to extract a URL handle.
 endpoints.length=0;assert.equal((await strict({url})).channelName,undefined);assert.equal(endpoints.length,1)
})