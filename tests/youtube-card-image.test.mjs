import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {youtubeCardImage,unusableMediumImage,unusableMaxresImage} from '../src/features/shorts/services/youtube-card-image.ts'
import {cardArtwork,createImageFailureCache} from '../src/features/shorts/services/card-artwork.ts'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
const id='abcdefghijk',identity='YouTube:'+id,url='https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg',now=Date.now()
const base={id:'s1',identity,platform:'YouTube',url:'https://www.youtube.com/shorts/'+id,title:'Título preservado',channelName:'Canal preservado',gameId:'g1',gameName:'Jogo preservado',createdAt:now,thumbnail:{url,obtainedAt:now,expiresAt:now+60000},gameCoverUrl:'/images/games/fallback.png'}
let vite,Card
before(async()=>{vite=await createServer({cacheDir:'node_modules/.cache/youtube-card-image',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Card=(await vite.ssrLoadModule('/src/features/shorts/components/ShortCard.tsx')).ShortCard})
after(async()=>vite?.close())

test('only the verified unsigned maxres JPEG gets the official 16:9 medium pair, preserving original',()=>{
 const source=youtubeCardImage(url,identity,()=>false)
 assert.equal(source.medium,'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg');assert.equal(source.srcSet,source.medium+' 320w, '+url+' 1280w');assert.match(source.sizes,/450px/)
 assert.equal(youtubeCardImage(url.replace('i.ytimg.com','img.youtube.com'),identity,()=>false).medium,'https://img.youtube.com/vi/'+id+'/mqdefault.jpg')
 for(const candidate of [url+'?signed=value',url.replace('/vi/','/vi_webp/').replace('.jpg','.webp'),url.replace('maxresdefault','hqdefault'),url.replace(id,'other-id'),url.replace('i.ytimg.com','i.ytimg.com.evil.test'),url.replace('https:','http:'),url.replace('.com/','.com:8443/'),url.replace('.com/','user@i.ytimg.com/'),url+'#x'])assert.equal(youtubeCardImage(candidate,identity,()=>false),undefined,candidate)
 assert.equal(url,'https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg')
})

test('failed medium returns to original before cover and Clipper; bounded failure cache prevents immediate retry',()=>{
 const cache=createImageFailureCache(),source=youtubeCardImage(url,identity,cache.has),copy=structuredClone(base)
 cache.add(source.medium);assert.equal(youtubeCardImage(url,identity,cache.has),undefined);assert.deepEqual(cardArtwork(base,now,cache.has),{kind:'thumbnail',url})
 cache.add(url);assert.deepEqual(cardArtwork(base,now,cache.has),{kind:'cover',url:base.gameCoverUrl})
 cache.add(base.gameCoverUrl);assert.equal(cardArtwork(base,now,cache.has).kind,'clipper');assert.deepEqual(base,copy)
 assert.equal(cardArtwork({...base,thumbnail:{...base.thumbnail,expiresAt:now-1}},now,()=>false).kind,'cover')
})

test('generic 4:3 placeholder is rejected even after density correction; actual medium ratio remains valid',()=>{
 for(const [w,h]of [[120,90],[240,180],[0,0],[0,90]])assert.equal(unusableMediumImage(w,h),true)
 for(const [w,h]of [[320,180],[200,112],[640,360]])assert.equal(unusableMediumImage(w,h),false)
 assert.equal(unusableMaxresImage(120,90),true);for(const [w,h]of [[480,360],[1280,720],[720,1280],[320,180]])assert.equal(unusableMaxresImage(w,h),false)
})

test('card preserves original src, content, laziness and no player; signed Twitch and TikTok URLs stay byte-identical',()=>{
 const render=short=>renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short,onOpen:()=>{}})))
 const optimized=render(base);assert.ok(optimized.includes('src="'+url+'"'));assert.match(optimized,/mqdefault.jpg 320w/);assert.match(optimized,/loading="lazy"/);assert.doesNotMatch(optimized,/fetchPriority="high"|loading="eager"|<iframe/)
 for(const[platform,identity,url]of [['Twitch','Twitch:ExampleClip','https://clips-media-assets2.twitch.tv/test.jpg?signature=unchanged'],['TikTok','TikTok:123456789','https://p16.tiktokcdn.com/test.jpg?x-expires=9999999999&signature=unchanged']]){
  const short={...base,platform,identity,thumbnail:{...base.thumbnail,url}},copy=structuredClone(short),html=render(short)
  assert.doesNotMatch(html,/mqdefault|srcset=/i);assert.ok(html.includes(url.replaceAll('&','&amp;')));assert.deepEqual(short,copy)
 }
 for(const html of [optimized,render({...base,thumbnail:undefined})]){assert.match(html,/Título preservado/);assert.match(html,/Canal preservado/);assert.match(html,/Jogo preservado/);assert.match(html,/href="\/jogos\/g1"/);assert.doesNotMatch(html,/<iframe/)}
})
