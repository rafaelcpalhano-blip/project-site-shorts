import test from 'node:test'
import assert from 'node:assert/strict'
import { createAudioPreference, createAudioObserver } from '../src/features/players/services/audio-preference.ts'
import { commandTikTok, tikTokMessage, buildEmbed } from '../src/features/players/services/embed.ts'
import { applyYouTubeAudio, loadYouTubeApi } from '../src/features/players/services/youtube-api.ts'
import { parseVideoUrl } from '../src/lib/validation/video-url.ts'

test('preferência só em memória persiste entre players; silêncio inicial não vira escolha',()=>{
 const pref=createAudioPreference(),observed=createAudioObserver(pref.set)
 let count=0;const unsub=pref.subscribe(()=>count++)
 observed(false);assert.equal(pref.getSnapshot(),true)
 observed(true);observed(false);assert.equal(pref.getSnapshot(),false)
 assert.equal(count,1)
 pref.set(false);assert.equal(count,1)
 pref.set(true);assert.equal(count,2)
 unsub();pref.set(false);assert.equal(count,2)
 assert.equal(createAudioPreference().getSnapshot(),true)
})

test('TikTok valida origem, janela e tipo; comandos usam origem exata e nunca wildcard',()=>{
 const sent=[],frame={postMessage:(...args)=>sent.push(args)}
 for(const command of ['unMute','mute','play'])commandTikTok(frame,command)
 assert.deepEqual(sent.map(([message,origin])=>[message.type,origin,message['x-tiktok-player']]),[['unMute','https://www.tiktok.com',true],['mute','https://www.tiktok.com',true],['play','https://www.tiktok.com',true]])
 assert.ok(sent.every(([message])=>Object.hasOwn(message,'value') && message.value === undefined))
 commandTikTok(null,'play');assert.equal(sent.length,3)
 const event={origin:'https://www.tiktok.com',source:frame,data:{type:'onMute',value:true,'x-tiktok-player':true}}
 assert.equal(tikTokMessage(event,frame),'muted')
 assert.equal(tikTokMessage({...event,data:{...event.data,value:false}},frame),'unmuted')
 for(const patch of [{source:{}},{origin:'https://evil.test'},{data:{...event.data,value:'false'}},{data:{...event.data,'x-tiktok-player':false}}]) assert.equal(tikTokMessage({...event,...patch},frame),null)
 assert.equal(tikTokMessage({...event,data:{type:'onStateChange',value:1,'x-tiktok-player':true}},frame),'playing')
})

test('YouTube preserva volume positivo; recupera zero sem volume máximo e respeita mute',()=>{
 const calls=[],player={getVolume:()=>0,setVolume:n=>calls.push(['volume',n]),unMute:()=>calls.push('unmute'),mute:()=>calls.push('mute')}
 applyYouTubeAudio(player,true);assert.deepEqual(calls,[['volume',50],'unmute'])
 calls.length=0;player.getVolume=()=>27;applyYouTubeAudio(player,true);assert.deepEqual(calls,['unmute'])
 calls.length=0;applyYouTubeAudio(player,false);assert.deepEqual(calls,['mute'])
})

test('Twitch clipes recebe escolha explícita; TikTok mantém controles sem bloquear volume',()=>{
 const env={origin:'https://clipzone.test',width:500,height:500,autoplay:true,audioEnabled:false}
 const clip='https://clips.twitch.tv/SomeClip',tt='https://www.tiktok.com/@gamer/video/123'
 const plan=url=>new URL(buildEmbed({...parseVideoUrl(url),url},env).src)
 assert.equal(plan(clip).searchParams.get('muted'),'true')
 assert.equal(plan(tt).searchParams.get('muted'),'0')
 assert.equal(plan(tt).searchParams.get('volume_control'),'1')
})

test('loader YouTube é único, resolve callback oficial e recupera erro sem retry automático',async()=>{
 const scripts=[],timers=new Map();let serial=0
 const oldWindow=globalThis.window,oldDocument=globalThis.document
 globalThis.window={setTimeout:fn=>{timers.set(++serial,fn);return serial},clearTimeout:id=>timers.delete(id)}
 globalThis.document={head:{append:script=>scripts.push(script)},createElement:()=>({remove(){this.removed=true}})}
 try {
  const first=loadYouTubeApi(),same=loadYouTubeApi();assert.equal(first,same);assert.equal(scripts.length,1)
  assert.equal(scripts[0].src,'https://www.youtube.com/iframe_api')
  scripts[0].onerror();await assert.rejects(first);assert.equal(scripts[0].removed,true);assert.equal(timers.size,0)
  const retry=loadYouTubeApi();assert.equal(scripts.length,2)
  window.YT={Player:function(){}};window.onYouTubeIframeAPIReady()
  assert.equal(await retry,window.YT);assert.equal(await loadYouTubeApi(),window.YT);assert.equal(scripts.length,2);assert.equal(timers.size,0)
 } finally {globalThis.window=oldWindow;globalThis.document=oldDocument}
})

test('preferência silenciosa não é sobrescrita por estado inicial audível antes do mute aplicado',()=>{
 const pref=createAudioPreference();pref.set(false)
 const observe=createAudioObserver(pref.set,false)
 observe(true);assert.equal(pref.getSnapshot(),false)
 observe(false);assert.equal(pref.getSnapshot(),false)
 observe(true);assert.equal(pref.getSnapshot(),true)
})

test('eventos atrasados não revertem escolha explícita enquanto aguardamos confirmação',()=>{
 const pref=createAudioPreference(),observe=createAudioObserver(pref.set)
 observe(true);observe.expect(false);pref.set(false)
 observe(true);assert.equal(pref.getSnapshot(),false)
 observe(false);assert.equal(pref.getSnapshot(),false)
 observe(true);assert.equal(pref.getSnapshot(),true)
})
