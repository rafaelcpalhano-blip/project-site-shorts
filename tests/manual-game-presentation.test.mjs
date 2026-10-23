import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {MemoryRouter} from 'react-router-dom'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
let server,Info,Navigation,Context,Router,Editor
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/manual-game-presentation',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Info=(await server.ssrLoadModule('/src/features/games/components/GameInfo.tsx')).GameInfo;Navigation=(await server.ssrLoadModule('/src/features/games/components/GamePageNavigation.tsx')).GamePageNavigation;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext;Router=MemoryRouter;Editor=(await server.ssrLoadModule('/src/features/admin/components/ManualGameEditor.tsx')).ManualGameEditor})
after(async()=>server?.close())
test('ficha manual publica informações cadastradas sem atribuir dados à IGDB ou traduzir conteúdo',()=>{
 const game=mapGameDetails('manual-test',{source:'manual',status:'active',officialName:'Jogo do Autor',description:'Descrição do autor & comunidade',imageUrl:'/images/games/capa.png',genres:['Aventura'],platforms:['PC'],releaseDate:'2026-10-22'})
 const html=render(h(Info,{game}));assert.ok(html.includes('Informações cadastradas pela comunidade Clipzone.'));assert.ok(html.includes('Descrição do autor &amp; comunidade'));assert.ok(html.includes('/images/games/capa.png'));assert.ok(!html.includes('Dados de jogos:'));assert.ok(!html.includes('Tradução automática'))
 const empty=render(h(Info,{game:{...game,description:'',imageUrl:null}}));assert.ok(empty.includes('Descrição não disponível'));assert.ok(!empty.includes('<img'))
})
test('retorno usa link interno /admin somente quando conta está autorizada',()=>{
 const view=value=>render(h(Router,null,h(Context.Provider,{value},h(Navigation))))
 assert.ok(view({user:{uid:'owner'},authorized:true}).includes('href="/admin"'))
 assert.ok(!view({user:{uid:'owner'},authorized:false}).includes('href="/admin"'))
 assert.ok(!view({user:null,authorized:false}).includes('href="/admin"'))
})
test('formulário usa apenas campos existentes, confirmação e motivo obrigatório, sem upload',()=>{
 const metadata={name:'Jogo',description:'',imageUrl:null,releaseDate:null,genres:['Aventura','RPG'],gameModes:[],platforms:[],aliases:[]}
 const html=render(h(Editor,{user:{uid:'owner'},detail:{metadata,game:{id:'manual-test',revision:0}},onSaved:async()=>{},onUnauthorized(){},onBusyChange(){}}))
 assert.ok(html.includes('Editar jogo manual'));assert.ok(html.includes('Motivo da edição'));assert.ok(html.includes('Confirmo a alteração'));assert.ok(html.includes('Cancelar edição'));assert.ok(!html.includes('type="file"'));assert.ok(html.includes('Salvar informações do jogo'));assert.ok(html.includes('Aventura'+String.fromCharCode(10)+'RPG'))
})
