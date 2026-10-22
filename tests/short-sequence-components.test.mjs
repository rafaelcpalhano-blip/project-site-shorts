import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,Dialog,Context,Card
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/short-sequence',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Dialog=(await server.ssrLoadModule('/src/features/shorts/components/ShortSequenceDialog.tsx')).ShortSequenceDialog;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext;Card=(await server.ssrLoadModule('/src/features/shorts/components/ShortCard.tsx')).ShortCard});after(async()=>server?.close())
const base={user:null,authorized:false},item=index=>({id:String(index),identity:'YouTube:abcdefghijk',url:'https://www.youtube.com/shorts/abcdefghijk',platform:'YouTube',title:'Vídeo '+index,channelName:'Canal',gameId:'game',createdAt:Date.now()}),items=[item(1),item(2),item(3)]
const render=short=>renderToStaticMarkup(h(Context.Provider,{value:base},h(Dialog,{short,items,onNavigate:()=>{},onClose:()=>{},onLikeCount:()=>{},onModerated:()=>{}})))
test('visualizador mantém nomes acessíveis, posição e limites da sequência',()=>{
 const first=render(items[0]),middle=render(items[1]),last=render(items[2]);assert.match(first,/aria-label="Vídeo anterior" disabled/);assert.ok(!middle.includes('aria-label="Vídeo anterior" disabled'));assert.match(last,/aria-label="Próximo vídeo" disabled/);assert.ok(middle.includes('Vídeo 2 de 3'));assert.ok(middle.includes('aria-label="Fechar janela"'));assert.ok(middle.includes('aria-labelledby='));assert.equal((middle.match(/<dialog/g)||[]).length,1)
})
test('primeiro render não monta players extras e mantém visitante sem ferramentas administrativas',()=>{
 const html=render(items[1]);assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('Excluir vídeo'));assert.ok(!html.includes('Bloquear vídeo'));assert.ok(html.includes('Carregando comentários'));assert.ok(!html.includes('Carregar player'))
})
test('miniaturas ausentes, expiradas ou inválidas usam fallback; metadado válido mantém imagem oficial',()=>{
 const short=items[0],now=Date.now(),valid={url:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',obtainedAt:now,expiresAt:now+60000};for(const thumbnail of [undefined,{...valid,expiresAt:now-1},{...valid,url:'https://evil.test/p.jpg'}]){const html=renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short:{...short,thumbnail},onOpen:()=>{}})));assert.ok(html.includes('Miniatura indisponível'));assert.ok(html.includes('/clipper/image-unavailable.png'))}const html=renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short:{...short,thumbnail:valid},onOpen:()=>{}})));assert.ok(html.includes('src="'+valid.url+'"'));assert.ok(html.includes('loading="lazy"'));assert.ok(!html.includes('<iframe'))
})


test('card agrupa total de comentários publicados ao lado das curtidas sem montar player',()=>{
 const html=renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short:{...items[0],likeCount:4,commentCount:12},onOpen:()=>{}})))
 assert.match(html,/4 curtidas no Clipzone/);assert.match(html,/12 comentários publicados/);assert.match(html,/Comentários <span>12<\/span>/);assert.ok(html.indexOf('4 curtidas')<html.indexOf('12 comentários'));assert.ok(html.includes('Ver jogo'));assert.ok(!html.includes('<iframe'))
 const legacy=renderToStaticMarkup(h(MemoryRouter,null,h(Card,{short:items[0],onOpen:()=>{}})))
 assert.ok(legacy.includes('total indisponível'));assert.ok(!legacy.includes('0 comentários publicados'))
})
