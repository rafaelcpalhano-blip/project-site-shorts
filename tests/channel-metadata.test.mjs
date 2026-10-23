import test from 'node:test'
import assert from 'node:assert/strict'
import {createYouTubeVerifier} from '../server/videos/youtube.ts'
import {createTwitchClipVerifier} from '../server/videos/twitch.ts'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
import {handleVideoPreview} from '../server/http/video-preview.ts'
import {createVideoPreviewClient} from '../src/features/submissions/services/video-preview-api.ts'

const youtube='https://www.youtube.com/shorts/abcdefghijk',twitch='https://clips.twitch.tv/ExampleClip',tiktok='https://www.tiktok.com/@gamer/video/123456789'
function setup(platform,name){
 let calls=0
 const fetcher=async url=>{calls++;if(platform==='YouTube'){assert.match(new URL(url).searchParams.get('fields'),/channelTitle/);return Response.json({items:[{id:'abcdefghijk',snippet:{title:'Jogada',channelTitle:name},status:{privacyStatus:'public',uploadStatus:'processed',embeddable:true},contentDetails:{duration:'PT30S'}}]})}if(platform==='Twitch')return Response.json({data:[{id:'ExampleClip',title:'Jogada',broadcaster_name:name,creator_name:'Pessoa que recortou',duration:30}]});return Response.json({type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789',author_name:name})}
 return {calls:()=>calls,verify:platform==='YouTube'?createYouTubeVerifier({apiKey:'test-only',fetcher}):platform==='Twitch'?createTwitchClipVerifier({clientId:'test-only',accessToken:async()=>'test-only',fetcher}):createTikTokVerifier(fetcher),url:platform==='YouTube'?youtube:platform==='Twitch'?twitch:tiktok}
}
test('três fontes reutilizam uma única consulta e Twitch usa transmissor, não criador do clipe',async()=>{
 for(const platform of ['YouTube','Twitch','TikTok']){const provider=setup(platform,'  Canal Ação 🎮  '),result=await provider.verify({url:provider.url,gameId:'preview'});assert.equal(result.channelName,'Canal Ação 🎮');assert.equal(result.existence,'confirmed');assert.equal(provider.calls(),1)}
})
test('canal ausente ou incompatível com limite não impede verificação do vídeo',async()=>{
 for(const platform of ['YouTube','Twitch','TikTok'])for(const name of [undefined,null,'','x'.repeat(81),'canal\u0000nome',42]){const provider=setup(platform,name),result=await provider.verify({url:provider.url,gameId:'preview'});assert.equal(result.channelName,undefined);assert.equal(result.existence,'confirmed');assert.equal(provider.calls(),1)}
})
test('prévia TikTok fornece canal mesmo sem título e nunca retorna HTML ou dados internos',async()=>{
 const provider=setup('TikTok','Canal teste'),origin='https://clipzone.test'
 const response=await handleVideoPreview(new Request(origin+'/api/shorts/preview',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({url:tiktok})}),{origin,resolveVisitor:async()=>'a'.repeat(64),checkAbuse:async()=>{},verify:provider.verify})
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{title:null,channelName:'Canal teste'});assert.equal(provider.calls(),1)
})
test('cliente valida título e canal juntos e rejeita canal malformado sem repetir chamadas',async()=>{
 for(const platform of ['YouTube','Twitch','TikTok']){const url=platform==='YouTube'?youtube:platform==='Twitch'?twitch:tiktok;let calls=0;const load=createVideoPreviewClient(async path=>{calls++;return path==='/api/session'?new Response(null,{status:204}):Response.json({title:'Jogada',channelName:'Canal Ação'})});assert.deepEqual(await load(url,new AbortController().signal),{title:'Jogada',channelName:'Canal Ação'});assert.equal(calls,2)}
 for(const name of [null,42,'x'.repeat(81),'bad\u0000name'])await assert.rejects(createVideoPreviewClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({title:'Jogada',channelName:name}))(youtube,new AbortController().signal))
})
