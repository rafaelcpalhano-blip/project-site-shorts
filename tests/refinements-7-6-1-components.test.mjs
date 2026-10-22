import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h,Fragment} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,picker,card,layout,home,provider
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/refinements-7-6-1',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 picker=(await server.ssrLoadModule('/src/features/games/components/OfficialGamePicker.tsx')).OfficialGamePicker
 card=(await server.ssrLoadModule('/src/features/shorts/components/ShortCard.tsx')).ShortCard
 layout=(await server.ssrLoadModule('/src/components/layout/SiteLayout.tsx')).SiteLayout
 home=(await server.ssrLoadModule('/src/features/shorts/pages/HomePage.tsx')).HomePage
 provider=(await server.ssrLoadModule('/src/app/providers/DemoProvider.tsx')).DemoProvider
});after(async()=>{await server?.close()})
const props={disabled:false,onBusyChange:()=>{},onSelected:()=>{},collapsible:true}
const render=node=>renderToStaticMarkup(h(MemoryRouter,null,node))
test('pesquisa tem nome curto, labels únicos e status fora da seção que será recolhida',()=>{
 const html=renderToStaticMarkup(h(Fragment,null,h(picker,props),h(picker,props))),labels=[...html.matchAll(/<label for="([^"]+)">Pesquisar nome oficial<\/label>/g)].map(m=>m[1]);assert.equal(labels.length,2);assert.notEqual(labels[0],labels[1]);assert.ok(labels.every(id=>html.includes('id="'+id+'"')));assert.match(html,/>Pesquisar<\/button>/);assert.ok(!html.includes('Pesquisar no IGDB'));assert.ok(html.indexOf('role="status"')>html.indexOf('</details>'));assert.ok(html.includes('<summary'))
})
test('card apresenta tempo relativo e tolera data inválida sem interromper renderização',()=>{
 const short={id:'s1',identity:'demo:1',platform:'YouTube',title:'Jogada',channelName:'Canal',gameId:'game',createdAt:Date.now()-3600000},html=render(h(card,{short,onOpen:()=>{}}));assert.match(html,/>há 1 hora<\/time>/);assert.ok(html.includes('aria-label="Abrir vídeo: Jogada"'));const invalid=render(h(card,{short:{...short,createdAt:NaN},onOpen:()=>{}}));assert.ok(invalid.includes('Data indisponível'));assert.ok(!invalid.includes('datetime="Invalid'))
})
test('cabeçalho preserva texto e acesso ao conteúdo sem link administrativo público',()=>{
 const html=render(h(layout));assert.ok(html.includes('Comunidade de Games'));assert.ok(!html.includes('Modo administrador'));assert.ok(!html.includes('href="/admin"'));assert.ok(html.includes('Pular para o conteúdo'));assert.ok(html.includes('id="main-content"'))
})
test('página inicial remove slogan antigo e aviso técnico extenso sem perder título semântico',()=>{
 const html=render(h(provider,null,h(home)));assert.ok(html.includes('<h1>Pequenos clipes. Grandes jogadas.</h1>'));assert.ok(!html.includes('O próximo GG está aqui.'));assert.ok(!html.includes('AMBIENTE LOCAL'));assert.ok(html.includes('Compartilhar short'));assert.ok(html.includes('Desenvolvimento ·'))
})
