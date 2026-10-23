import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {MemoryRouter} from 'react-router-dom'
import {renderToStaticMarkup as renderBase} from 'react-dom/server'
const render=node=>renderBase(h(MemoryRouter,null,node))
let server,Content,Context,Form
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/refinements-7-6-7-a',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Content=(await server.ssrLoadModule('/src/features/shorts/components/FirestoreShortDialog.tsx')).FirestoreShortContent;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext;Form=(await server.ssrLoadModule('/src/features/submissions/components/PersistentSubmissionDialog.tsx')).PersistentSubmissionDialog})
after(async()=>server?.close())
const short={id:'short',title:'Jogada',platform:'YouTube',url:'https://www.youtube.com/shorts/abcdefghijk',identity:'YouTube:abcdefghijk',createdAt:1,gameId:'game',gameName:'Meu jogo'}
test('canal fica depois do player e antes do título; texto é escapado e ausência não inventa canal',()=>{
 const html=channelName=>render(h(Context.Provider,{value:{user:null,authorized:false}},h(Content,{short:{...short,channelName},onLikeCount(){},onModerated(){},onBusyChange(){}})))
 const result=html('Canal <script>');assert.ok(result.indexOf('Assistir na plataforma')<result.indexOf('Nome do canal'));assert.ok(result.indexOf('Nome do canal')<result.indexOf('>Jogada</h2>'));assert.ok(result.includes('Canal &lt;script&gt;'));assert.ok(result.indexOf('Nome do canal')<result.indexOf('Fonte: YouTube'));assert.ok(result.indexOf('Fonte: YouTube')<result.indexOf('Jogo:'));assert.match(result,/href="\/jogos\/game"[^>]*>Meu jogo<\/a>/);assert.ok(!result.includes('Limpar cookies'));assert.ok(html('').includes('Não informado'));assert.ok(!result.includes('Sem som?'));assert.ok(!result.includes('Preferir som'));assert.ok(!result.includes('Reproduzir com som'))
})
test('formulário preserva campos, validação obrigatória e acesso ao cadastro de jogos',()=>{
 const result=render(h(Form,{onClose(){},onSubmitted(){}}));assert.ok(result.includes('id="persistent-url"'));assert.ok(result.includes('id="persistent-title"'));assert.ok(result.includes('<select'));assert.ok(result.includes('Não encontrou seu jogo?'));assert.ok(result.includes('id="persistent-channel"'));assert.match(result,/<select[^>]*hidden=""[^>]*required=""/);assert.ok(result.includes('aria-haspopup="listbox"'));assert.ok(!result.includes('Confirmar publicação'))
})
