import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {createServer} from 'vite'
import {welcomeSources,unavailableSources} from '../src/components/clipper/image-sources.ts'
const root=new URL('../',import.meta.url)
const files={welcome:{bytes:198180,hash:'aeb36c24b4e8fbf7d1ec35d66b40b4732aacc05b98f3e4f660db8bfc048334b4',sources:welcomeSources},'image-unavailable':{bytes:230978,hash:'d1c9454e0059bab644df9be80bb06e190f645b2db2ab6dbd2b33168952f6a5c6',sources:unavailableSources}}
const read=p=>readFileSync(new URL('public'+p,root))
function webp(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP')
 for(let at=12;at+8<bytes.length;){const kind=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),start=at+8
  if(kind==='VP8L'){assert.equal(bytes[start],0x2f);const bits=bytes.readUInt32LE(start+1);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1,alpha:!!(bits>>>28&1)}}
  if(kind==='VP8X')return {width:bytes.readUIntLE(start+4,3)+1,height:bytes.readUIntLE(start+7,3)+1,alpha:!!(bytes[start]&16)}
  at=start+size+(size%2)
 }
 assert.fail('WebP sem dimensões verificáveis')
}
let vite,Card,Community,Welcome,Admin,Context
before(async()=>{vite=await createServer({cacheDir:'node_modules/.cache/clipper-image-variants',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Card=(await vite.ssrLoadModule('/src/features/shorts/components/ShortCard.tsx')).ShortCard;Community=(await vite.ssrLoadModule('/src/components/clipper/ClipperCommunity.tsx')).ClipperCommunity;Welcome=(await vite.ssrLoadModule('/src/components/clipper/ClipperWelcome.tsx')).ClipperWelcome;Admin=(await vite.ssrLoadModule('/src/features/admin/pages/AdminPage.tsx')).AdminPage;Context=(await vite.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext})
after(async()=>vite?.close())

test('originais preservados; candidatos existem, têm proporção/alpha e variantes custam menos da metade',()=>{
 for(const[name,info]of Object.entries(files)){
  const original=read('/clipper/'+name+'.webp');assert.equal(original.length,info.bytes);assert.equal(createHash('sha256').update(original).digest('hex'),info.hash)
  const candidates=info.sources.split(', ').map(item=>item.split(' '));assert.equal(candidates.length,3)
  for(const[url,descriptor]of candidates){const bytes=read(url),width=Number.parseInt(descriptor,10);assert.ok([160,320,512].includes(width));assert.deepEqual(webp(bytes),{width,height:width*3/2,alpha:true});if(width<512)assert.ok(bytes.length<=original.length/2,url+' exceeded byte budget')}
 }
})

test('boas-vindas, comunidade e login selecionam variantes sem alterar caixas e sem antecipar frames',()=>{
 const state={auth:null,user:null,authorized:false,checking:false,error:'',initialize:async()=>{},verify:async()=>{},invalidate(){},beginSignIn(){},endSession:async()=>{}}
 const outputs=[renderToStaticMarkup(h(Welcome)),renderToStaticMarkup(h(Community)),renderToStaticMarkup(h(Context.Provider,{value:state},h(Admin)))]
 for(const html of outputs){assert.match(html,/src="\/clipper\/welcome.webp"/);assert.match(html,/srcSet="[^\"]*welcome-160.webp 160w[^\"]*welcome-320.webp 320w[^\"]*welcome.webp 512w"/i);assert.match(html,/sizes="[^\"]+"/);assert.match(html,/width="512" height="768"/);assert.doesNotMatch(html,/<iframe|tickle-[123]\.webp/)}
})

test('srcset do Clipper só entra no fallback, não modifica miniaturas oficiais nem metadados do card',()=>{
 const now=Date.now(),short={id:'s1',identity:'YouTube:abcdefghijk',platform:'YouTube',title:'Jogada original',channelName:'Canal original',gameId:'g1',gameName:'Jogo original',createdAt:now,likeCount:2,commentCount:3}
 const render=value=>renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short:value,onOpen:()=>{}})))
 const fallback=render(short);assert.match(fallback,/image-unavailable-160.webp 160w/);assert.match(fallback,/sizes="144px"/);assert.match(fallback,/Miniatura indisponível/)
 const complete={...short,thumbnail:{url:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',obtainedAt:now,expiresAt:now+60000}},copy=structuredClone(complete),official=render(complete)
 assert.doesNotMatch(official,/srcset=|image-unavailable-/i);assert.match(official,/src="https:\/\/i.ytimg.com\/vi\/abcdefghijk\/hqdefault.jpg"/);assert.deepEqual(complete,copy)
 for(const html of [fallback,official]){assert.match(html,/Jogada original/);assert.match(html,/Canal original/);assert.match(html,/Jogo original/);assert.match(html,/Comentários 3 publicados/);assert.match(html,/href="\/jogos\/g1"/);assert.doesNotMatch(html,/<iframe/)}
})
