import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfiguredVideoVerifier } from '../server/videos/configured.ts'
import { createYouTubeOEmbedVerifier } from '../server/videos/youtube.ts'
import { handleVideoPreview } from '../server/http/video-preview.ts'
import { decidePublication } from '../server/submissions/decision.ts'
import { submitShort } from '../server/submissions/submit-short.ts'
const youtube='https://www.youtube.com/shorts/abcdefghijk'
const tiktok='https://www.tiktok.com/@gamer/video/12345'
const yt={type:'video',provider_name:'YouTube',provider_url:'https://www.youtube.com/',title:'Título da fonte',html:'<script>bad()</script>',thumbnail_url:'https://evil.test'}
const tt={...yt,version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com/'}
test('default composition retrieves titles without keys but does not authorize unverified publication',async()=>{
 const calls=[]
 const verify=createConfiguredVideoVerifier({fetcher:async(url,options)=>{
  calls.push(url)
  assert.equal(options.redirect,'error');assert.ok(options.signal)
  assert.equal(url.searchParams.has('key'),false)
  return Response.json(url.hostname==='www.youtube.com'?yt:tt)
 }})
 for(const url of [youtube,tiktok]){
  const result=await verify({url,gameId:'game'})
  assert.equal(result.title,'Título da fonte')
  assert.equal(result.existence,'confirmed')
  assert.equal(result.gameMatch,'unknown');assert.equal(result.shortFormat,'unknown')
  assert.equal(decidePublication(result).status,'retry')
  assert.ok(!JSON.stringify(result).includes('script'));assert.ok(!JSON.stringify(result).includes('evil.test'))
 }
 assert.equal(calls[0].origin+calls[0].pathname,'https://www.youtube.com/oembed')
 assert.equal(calls[0].searchParams.get('url'),'https://www.youtube.com/watch?v=abcdefghijk')
 assert.equal(calls[1].origin+calls[1].pathname,'https://www.tiktok.com/oembed')
})
test('YouTube oEmbed fails closed for hostile URL, wrong provider, invalid title, redirects and inaccessible metadata',async()=>{
 for(const data of [null,{}, {...yt,type:'rich'},{...yt,provider_name:'Other'},{...yt,provider_url:'https://evil.test'}]){
  const evidence=await createYouTubeOEmbedVerifier(async()=>Response.json(data))({url:youtube})
  assert.equal(evidence.existence,'unknown')
 }
 for(const title of [undefined,'','x'.repeat(501),'bad\u0000title']){
  const evidence=await createYouTubeOEmbedVerifier(async()=>Response.json({...yt,title}))({url:youtube})
  assert.equal(evidence.title,undefined)
  assert.equal(decidePublication(evidence).status,'retry')
 }
 for(const status of [403,404,429,500]){
  assert.equal((await createYouTubeOEmbedVerifier(async()=>new Response(null,{status}))({url:youtube})).existence,'unknown')
 }
 assert.equal((await createYouTubeOEmbedVerifier(async()=>{throw new Error('private provider details')})({url:youtube})).existence,'unknown')
 let calls=0
 const check=createYouTubeOEmbedVerifier(async()=>{calls++;return Response.json(yt)})
 for(const url of ['https://evil.test/shorts/abcdefghijk',tiktok]) await check({url})
 assert.equal(calls,0)
})
test('configured API key selects Data API only; Twitch adapter remains unchanged',async()=>{
 const urls=[]
 let twitchCalls=0
 const verify=createConfiguredVideoVerifier({youtubeApiKey:'private-test-key',fetcher:async url=>{
  urls.push(url)
  return Response.json({items:[{id:'abcdefghijk',snippet:{title:'Data API'},status:{privacyStatus:'public',uploadStatus:'processed'}}]})
 },twitch:async()=>{twitchCalls++;return {existence:'confirmed',shortFormat:'confirmed',gameMatch:'confirmed',moderation:'clear',flags:[]}}})
 const result=await verify({url:youtube,gameId:'game'})
 assert.equal(urls[0].origin,'https://www.googleapis.com')
 assert.equal(result.title,'Data API');assert.ok(!JSON.stringify(result).includes('private-test-key'))
 assert.equal((await verify({url:'https://clips.twitch.tv/Clip',gameId:'game'})).moderation,'unavailable')
 assert.equal(twitchCalls,1)
})
test('composed preview is title-only; submission refetches original and does not consume publication quota when uncertain',async()=>{
 let title='Original A'
 const verify=createConfiguredVideoVerifier({fetcher:async()=>Response.json({...yt,title})})
 const request=new Request('https://clipzone.test/api/shorts/preview',{method:'POST',headers:{Origin:'https://clipzone.test','Content-Type':'application/json'},body:JSON.stringify({url:youtube})})
 const dependencies={origin:'https://clipzone.test',resolveVisitor:async()=> 'a'.repeat(64),checkAbuse:async()=>{},verify}
 const response=await handleVideoPreview(request,dependencies)
 assert.deepEqual(await response.json(),{title:'Original A'})
 title='Original B'
 const writes=new Map()
 await assert.rejects(submitShort({url:youtube,gameId:'game',title:'Título escolhido'},'a'.repeat(64),{verify,checkAbuse:async()=>{},now:()=>new Date(),
  store:{transact:async()=>assert.fail('uncertain metadata must not start a transaction')}}),{code:'verification-incomplete'})
 assert.equal(writes.size,0)
})
