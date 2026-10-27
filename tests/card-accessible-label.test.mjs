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
test('preview accessible name contains the title, visible platform, game and image fallback caption',()=>{
 for(const platform of ['YouTube','Twitch','TikTok']){
  const html=markup(platform,0),label=html.match(/aria-label="(Abrir vídeo:[^"]+)"/)[1]
  for(const text of ['Jogada original',platform,'Jogo original'])assert.ok(label.includes(text))
  if(html.includes('>Miniatura indisponível<'))assert.ok(label.includes('Miniatura indisponível'))
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
