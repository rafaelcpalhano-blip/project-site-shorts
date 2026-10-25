import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Source
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/admin-mobile-layout',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Source=(await server.ssrLoadModule('/src/features/admin/components/UpdateSourceLink.tsx')).UpdateSourceLink})
after(async()=>server?.close())
test('fonte é HTTPS oficial compatível com plataforma, com isolamento de nova aba',()=>{
 const html=render(h(Source,{source:'https://clips.twitch.tv/ValidPublicClip',platform:'Twitch'}))
 assert.match(html,/href="https:\/\/clips.twitch.tv\/ValidPublicClip"/);assert.match(html,/rel="noopener noreferrer"/);assert.match(html,/target="_blank"/)
 for(const source of ['javascript:alert(1)','https://evil.test/video','https://www.youtube.com/shorts/28nFy4tGcwI'])assert.equal(render(h(Source,{source,platform:'Twitch'})),'')
})
