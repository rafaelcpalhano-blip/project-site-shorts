import test, {before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let vite,Card
before(async()=>{vite=await createServer({cacheDir:'node_modules/.cache/card-accessible-label',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Card=(await vite.ssrLoadModule('/src/features/shorts/components/ShortCard.tsx')).ShortCard})
after(async()=>vite?.close())
function markup(platform,commentCount){return render(h(MemoryRouter,null,h(Card,{short:{id:'s1',platform,identity:'fixture:1',url:'https://example.test',title:'Jogada original',gameId:'g1',gameName:'Jogo original',channelName:'Canal',createdAt:Date.now(),commentCount},onOpen(){}})))}
test('preview uses native visible text followed by a screen-reader action and title, without overriding its name',()=>{
 for(const platform of ['YouTube','Twitch','TikTok']){
  const html=markup(platform,0),preview=html.match(/<button[^>]*>([\s\S]*?)<\/button>/)[0]
  assert.doesNotMatch(preview,/aria-label=|aria-labelledby=/)
  assert.ok(preview.indexOf(platform)<preview.indexOf('Jogo original'))
  assert.ok(preview.indexOf('Jogo original')<preview.indexOf('Abrir vídeo: Jogada original'))
  assert.match(preview,/<span class="[^"]*srOnly[^"]*"> — Abrir vídeo: Jogada original<\/span>/)
  for(const image of preview.matchAll(/<img[^>]*>/g))assert.match(image[0],/alt=""/)
  assert.doesNotMatch(html,/<iframe/)
 }
})

test('comments accessible name preserves visible label and count in the same order, including unknown totals',()=>{
 for(const count of [0,1,12,undefined]){
  const html=markup('YouTube',count),visible='Comentários '+(count??'—')
  const label=html.match(/aria-label="(Comentários[^"]+)"/)[1]
  assert.ok(label.startsWith(visible))
  if(count===undefined)assert.ok(label.includes('total indisponível'))
  else assert.ok(label.includes('publicados'))
 }
})
