import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
let server,Community,Footer
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/clipper-community',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Community=(await server.ssrLoadModule('/src/components/clipper/ClipperCommunity.tsx')).ClipperCommunity;Footer=(await server.ssrLoadModule('/src/components/layout/SiteFooter.tsx')).SiteFooter});after(async()=>server?.close())
test('initial render has four keyboard buttons and original sized lazy mascot; generated frames load only after interaction',()=>{const html=renderToStaticMarkup(h(Community));assert.equal((html.match(/aria-label="Trocar mensagem:/g)||[]).length,4);assert.equal((html.match(/<button/g)||[]).length,5);assert.match(html,/Fazer cócegas no Clipper/);assert.match(html,/width="512" height="768"/);assert.match(html,/loading="lazy"/);assert.doesNotMatch(html,/tickle-[123]\.webp|<audio|<iframe/);assert.match(html,/alt=""/)})
test('footer shows operational support email with mailto and no demonstration disclaimer',()=>{const html=renderToStaticMarkup(h(Footer));assert.match(html,/href="mailto:clipzone.suporte@gmail.com"/);assert.doesNotMatch(html,/teste\.suporte|endereço de demonstração/);assert.match(html,/Como os vídeos funcionam/);assert.match(html,/respectivos titulares/)})
