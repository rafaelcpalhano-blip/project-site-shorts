import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEmbed, tikTokMessage } from '../src/features/players/services/embed.ts'
import { createPlaybackCoordinator } from '../src/features/players/services/playback.ts'
import { parseVideoUrl } from '../src/lib/validation/video-url.ts'
const environment = { origin:'https://127.0.0.1:5174', width:448, height:360 }
const video = url => ({ ...parseVideoUrl(url), url })
test('official URLs use canonical IDs, native controls and no autoplay or looping',()=>{
 const youtube = buildEmbed(video('https://m.youtube.com/shorts/abcdefghijk?autoplay=1'),environment)
 const yt = new URL(youtube.src)
 assert.equal(yt.origin,'https://www.youtube.com')
 assert.equal(yt.pathname,'/embed/abcdefghijk')
 assert.equal(yt.searchParams.get('autoplay'),'0');assert.equal(yt.searchParams.get('controls'),'1')
 assert.equal(yt.searchParams.get('loop'),'0');assert.equal(yt.searchParams.get('enablejsapi'),'1');assert.equal(yt.searchParams.get('origin'),environment.origin)
 const tiktok = new URL(buildEmbed(video('https://www.tiktok.com/@gamer/video/123456789'),environment).src)
 assert.equal(tiktok.origin,'https://www.tiktok.com');assert.equal(tiktok.pathname,'/player/v1/123456789')
 assert.equal(tiktok.searchParams.get('autoplay'),'0');assert.equal(tiktok.searchParams.get('controls'),'1')
 assert.equal(tiktok.searchParams.get('loop'),'0');assert.equal(tiktok.searchParams.get('description'),'1')
 const twitch = new URL(buildEmbed(video('https://www.twitch.tv/gamer/clip/RealClip?parent=evil.test&autoplay=true'),environment).src)
 assert.equal(twitch.origin,'https://clips.twitch.tv');assert.equal(twitch.pathname,'/embed')
 assert.equal(twitch.searchParams.get('clip'),'RealClip')
 assert.deepEqual(twitch.searchParams.getAll('parent'),['127.0.0.1'])
 assert.equal(twitch.searchParams.get('autoplay'),'false')
})
test('fake publications, hostile links, mismatched identity and insecure origin cannot mount embeds',()=>{
 assert.equal(buildEmbed({platform:'Twitch',identity:'demo:1'},environment).src,undefined)
 for(const url of ['javascript:alert(1)','https://clips.twitch.tv.evil.test/Clip','https://evil.test/embed','https://u:p@clips.twitch.tv/Clip','http://clips.twitch.tv/Clip']){
  const plan=buildEmbed({url,platform:'Twitch',identity:'Twitch:Clip'},environment)
  assert.equal(plan.src,undefined);assert.equal(plan.source,undefined)
 }
 const item=video('https://clips.twitch.tv/Clip')
 for(const patch of [{platform:'YouTube'},{identity:'Twitch:Different'}]){
  const plan=buildEmbed({...item,...patch},environment)
  assert.equal(plan.src,undefined);assert.equal(plan.source,'https://clips.twitch.tv/Clip')
 }
 for(const origin of ['http://clipzone.test','javascript:alert(1)','https://u:p@clipzone.test','https://clipzone.test/path','null']){
  assert.equal(buildEmbed(item,{...environment,origin}).src,undefined)
 }
})
test('provider minimum size is enforced using actual iframe space, preserving source fallback',()=>{
 const twitch=video('https://clips.twitch.tv/Clip')
 assert.ok(buildEmbed(twitch,{...environment,width:400,height:300}).src)
 for(const size of [{width:399,height:300},{width:400,height:299},{width:NaN,height:300}]){
  const plan=buildEmbed(twitch,{...environment,...size})
  assert.equal(plan.src,undefined);assert.ok(plan.source);assert.ok(plan.reason)
 }
 const youtube=video('https://www.youtube.com/shorts/abcdefghijk')
 assert.ok(buildEmbed(youtube,{...environment,width:200,height:200}).src)
 assert.equal(buildEmbed(youtube,{...environment,width:199,height:200}).src,undefined)
 assert.equal(buildEmbed(youtube,{...environment,width:200,height:199}).src,undefined)
 const tiktok=video('https://www.tiktok.com/@gamer/video/123')
 assert.equal(buildEmbed(tiktok,{...environment,width:199,height:400}).src,undefined)
})
test('Twitch parent comes from the current hostname without port, path or spoofed query',()=>{
 const plan=buildEmbed(video('https://clips.twitch.tv/Clip'),{...environment,origin:'https://clipzone.example:8443'})
 assert.equal(new URL(plan.src).searchParams.get('parent'),'clipzone.example')
})
test('TikTok messages require exact origin, current frame window and explicit documented envelope',()=>{
 const frame={},other={},event={origin:'https://www.tiktok.com',source:frame,data:{'x-tiktok-player':true,type:'onPlayerReady'}}
 assert.equal(tikTokMessage(event,frame),'ready')
 assert.equal(tikTokMessage({...event,data:{'x-tiktok-player':true,type:'onPlayerError',value:{errorCode:1001,errorType:'INVALID_VIDEO'}}},frame),'error')
 for(const patch of [{origin:'https://www.tiktok.com.evil.test'},{origin:'null'},{source:other},{data:'{"type":"onPlayerReady"}'},{data:{type:'onPlayerReady'}}]){
  assert.equal(tikTokMessage({...event,...patch},frame),null)
 }
 assert.equal(tikTokMessage(event,null),null)
})
test('one playback lease replaces the previous player, cleans subscriptions and ignores stale release',()=>{
 const playback=createPlaybackCoordinator()
 let calls=0
 const unsubscribe=playback.subscribe(()=>calls++)
 assert.equal(playback.getSnapshot(),null)
 playback.activate('first');playback.activate('first')
 assert.equal(calls,1)
 playback.activate('second')
 playback.release('first')
 assert.equal(playback.getSnapshot(),'second')
 playback.release('second')
 assert.equal(playback.getSnapshot(),null)
 assert.equal(calls,3)
 unsubscribe();playback.activate('third')
 assert.equal(calls,3)
 playback.release('third')
})

test('autoplay explícito preserva controles, identidade e ausência de loop nas três plataformas',()=>{
 for(const [url,value]of [['https://www.youtube.com/shorts/abcdefghijk','1'],['https://www.tiktok.com/@gamer/video/123','1'],['https://clips.twitch.tv/Clip','true']]){const plan=buildEmbed(video(url),{...environment,autoplay:true}),src=new URL(plan.src);assert.equal(src.searchParams.get('autoplay'),value);if(plan.platform!=='Twitch'){assert.equal(src.searchParams.get('loop'),'0');assert.equal(src.searchParams.get('controls'),'1')}}
 assert.equal(buildEmbed(video('https://clips.twitch.tv/Clip'),{...environment,width:399,autoplay:true}).src,undefined)
})
test('TikTok diferencia autoplay bloqueado de vídeo inválido sem aceitar mensagens forjadas',()=>{
 const frame={},event={origin:'https://www.tiktok.com',source:frame,data:{'x-tiktok-player':true,type:'onPlayerError',value:{errorCode:3002,errorType:'AUTOPLAY_ERROR'}}};assert.equal(tikTokMessage(event,frame),'autoplay-blocked');assert.equal(tikTokMessage({...event,source:{}},frame),null);assert.equal(tikTokMessage({...event,origin:'https://evil.test'},frame),null)
})

test('preferência de áudio preserva controles oficiais e nunca ativa autoplay no feed',()=>{
 for(const [link,muted]of [['https://www.tiktok.com/@gamer/video/123456789','0'],['https://clips.twitch.tv/AudioClip','false']]){
 const plan=buildEmbed(video(link),environment),url=new URL(plan.src);assert.equal(url.searchParams.get('muted'),muted);assert.ok(['0','false'].includes(url.searchParams.get('autoplay')))
 if(plan.platform==='TikTok')assert.equal(url.searchParams.get('volume_control'),'1')
 }
 const yt=new URL(buildEmbed(video('https://www.youtube.com/shorts/abcdefghijk'),environment).src);assert.equal(yt.searchParams.has('mute'),false);assert.equal(yt.searchParams.get('controls'),'1')
})
