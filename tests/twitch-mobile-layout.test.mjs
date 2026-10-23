import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Player
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/twitch-mobile',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Player=(await server.ssrLoadModule('/src/features/players/components/OfficialPlayer.tsx')).OfficialPlayer})
after(async()=>server?.close())
const base={id:'clip',title:'Meu clip',channelName:'Canal',createdAt:1,gameId:'game'}
test('somente Twitch recebe contêiner de rolagem e mantém link oficial fora do player',()=>{
 const html=render(h(Player,{short:{...base,platform:'Twitch',identity:'Twitch:RealClip',url:'https://clips.twitch.tv/RealClip'}}))
 assert.match(html,/role="region" aria-label="Player Twitch"/);assert.match(html,/data-short-interactions/);assert.match(html,/href="https:\/\/clips.twitch.tv\/RealClip" target="_blank" rel="noopener noreferrer"/)
 for(const short of [{platform:'YouTube',identity:'YouTube:abcdefghijk',url:'https://www.youtube.com/shorts/abcdefghijk'},{platform:'TikTok',identity:'TikTok:123456789',url:'https://www.tiktok.com/@gamer/video/123456789'}]){
   const result=render(h(Player,{short:{...base,...short}}));assert.doesNotMatch(result,/role="region" aria-label="Player Twitch"/);assert.match(result,/Assistir na plataforma/)
 }
})
