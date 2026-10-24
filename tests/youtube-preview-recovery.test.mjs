import test from 'node:test'
import assert from 'node:assert/strict'
import {createYouTubeOEmbedVerifier} from '../server/videos/youtube.ts'
import {createConfiguredVideoVerifier} from '../server/videos/configured.ts'
import {createVideoPreviewVerifier} from '../server/videos/preview.ts'
import {decidePublication} from '../server/submissions/decision.ts'
const input={url:'https://m.youtube.com/shorts/abcdefghijk?si=example',gameId:'preview'}
const unknown={existence:'unknown',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[]}
const metadata={type:'video',provider_name:'YouTube',provider_url:'https://www.youtube.com',title:'Título original',author_name:'Canal original'}
test('oEmbed extracts original channel and title, canonical URL; rejects malformed optional author',async()=>{
 for(const author of ['Canal original',undefined,'bad\u0000name','x'.repeat(81)]){
 const verify=createYouTubeOEmbedVerifier(async endpoint=>{assert.equal(endpoint.searchParams.get('url'),'https://www.youtube.com/watch?v=abcdefghijk');return Response.json({...metadata,author_name:author})})
 const result=await verify(input);assert.equal(result.title,metadata.title);assert.equal(result.channelName,author==='Canal original'?author:undefined)
 }
})
test('Data API rejection can recover preview without weakening submission duration or embedding verdict',async()=>{
 const calls=[],fetcher=async url=>{calls.push(url.hostname);return url.hostname==='www.googleapis.com'?new Response(null,{status:403}):Response.json(metadata)}
 const strict=createConfiguredVideoVerifier({youtubeApiKey:'test-key',fetcher}),preview=createVideoPreviewVerifier(strict,fetcher)
 const result=await preview(input);assert.equal(result.title,metadata.title);assert.equal(result.channelName,metadata.author_name);assert.equal(result.shortFormat,'unknown');assert.equal(decidePublication(result,'YouTube').status,'retry');assert.deepEqual(calls,['www.googleapis.com','www.youtube.com'])
 assert.equal((await strict(input)).existence,'unknown')
})
test('complete Data API metadata avoids fallback; non-YouTube and missing videos never recover',async()=>{
 let calls=0;const fallback=async()=>{calls++;return Response.json(metadata)}
 for(const evidence of [{...unknown,title:'Título',channelName:'Canal',existence:'confirmed'},{...unknown,existence:'missing'}])assert.equal(await createVideoPreviewVerifier(async()=>evidence,fallback)(input),evidence)
 assert.equal((await createVideoPreviewVerifier(async()=>unknown,fallback)({url:'https://clips.twitch.tv/Test',gameId:'preview'})).existence,'unknown');assert.equal(calls,0)
})
test('fallback failure stays unavailable and never leaks upstream credentials/errors',async()=>{
 const result=await createVideoPreviewVerifier(async()=>unknown,async()=>{throw Error('secret')})(input);assert.equal(result,unknown);assert.ok(!JSON.stringify(result).includes('secret'))
})
