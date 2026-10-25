import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
let server,context,inline,sections,page,selection
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/admin-stage-7-6-2',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext
 inline=(await server.ssrLoadModule('/src/features/admin/components/InlineModeration.tsx')).InlineModeration
 sections=(await server.ssrLoadModule('/src/features/admin/components/AdminSections.tsx')).AdminSections
 selection=(await server.ssrLoadModule('/src/features/admin/components/CommentSelectionModeration.tsx')).CommentSelectionModeration
 page=(await server.ssrLoadModule('/src/features/admin/pages/AdminPage.tsx')).AdminPage
});after(async()=>server?.close())
const user={uid:'owner'},base={auth:null,user:null,authorized:false,checking:false,error:'',initialize:async()=>{},verify:async()=>{},invalidate:()=>{},beginSignIn:()=>{},endSession:async()=>{}}
const render=(component,props,value=base)=>renderToStaticMarkup(h(context.Provider,{value},h(component,props)))
const tools={kind:'short',id:'a'.repeat(64),disabled:false,onCompleted:()=>{},onBusyChange:()=>{}}
test('visitante, conta conectada sem aprovação e contexto incompleto não veem ferramentas',()=>{
 for(const patch of [{},{user},{authorized:true}]){const html=render(inline,tools,{...base,...patch});assert.equal(html,'')}
})
test('administrador validado vê Excluir/Bloquear; comentário oferece apenas Excluir',()=>{
 const value={...base,user,authorized:true};const short=render(inline,tools,value);assert.ok(short.includes('Excluir'));assert.ok(short.includes('Bloquear vídeo'));assert.ok(!short.includes('<textarea'));const comment=render(inline,{...tools,kind:'comment'},value);assert.ok(comment.includes('Excluir'));assert.ok(!comment.includes('Bloquear vídeo'))
})
test('painel monta somente seção inicial e mantém navegação identificável por teclado',()=>{
 const html=render(sections,{user,onUnauthorized:()=>{}},{...base,user,authorized:true});assert.equal((html.match(/<h2/g)||[]).length,1);assert.ok(!html.includes('Ações administrativas em lote'));assert.ok(!html.includes('Confirmar ação'));assert.ok(html.includes('<h2 id="catalog-heading">'));assert.ok(!html.includes('id="game-requests-heading"'));assert.ok(!html.includes('id="comment-review-heading"'));assert.ok(!html.includes('id="moderation-heading"'));assert.equal((html.match(/aria-pressed="true"/g)||[]).length,2);assert.ok(html.includes('aria-label="Seções administrativas"'));assert.ok(html.includes('aria-controls="admin-section-catalog"'));assert.ok(html.includes('aria-controls="admin-section-updates"'));assert.ok(!html.includes('Fluxo anterior de inclusão de jogos'));assert.ok(!html.includes('id="updates-heading"'))
})
test('rota administrativa continua oferecendo login direto, sem UID e sem painéis privados ao visitante',()=>{
 const html=render(page,{}, {...base,auth:{}});assert.ok(html.includes('Login Administrativo'));assert.ok(!html.includes('UID da sua conta'));assert.ok(!html.includes('id="catalog-heading"'));assert.ok(!html.includes('Login com TOTP concluído'))
})

test('ações de vídeo não usam caixa inset e têm nomes explícitos',()=>{
 const html=render(inline,tools,{...base,user,authorized:true});assert.ok(html.includes('Excluir vídeo'));assert.ok(!html.includes('class="inset"'));assert.ok(!html.includes('<fieldset'))
})
test('comentários públicos preservados; seleção de exclusão só para administrador validado',()=>{
 const props={shortId:'a'.repeat(64),comments:[{id:'c',content:'Comentário de teste',createdAt:0}],disabled:false,onSelectionChange:()=>{},onBusyChange:()=>{},onRemoved:()=>{}};
 for(const value of [base,{...base,user},{...base,user,authorized:true}]){const html=render(selection,props,value);assert.ok(html.includes('Comentário de teste'));assert.equal(html.includes('Excluir comentários'),value.authorized);assert.ok(!html.includes('<fieldset'));assert.ok(!html.includes('class="inset"'))}
})

test('catálogo oferece quatro ordens de fila completa com rótulo associado',()=>{
 const html=render(sections,{user,onUnauthorized:()=>{}},{...base,user,authorized:true});assert.ok(html.includes('Ordenar fila completa'));for(const option of ['date-desc','date-asc','text-asc','text-desc'])assert.ok(html.includes('value="'+option+'"'));assert.match(html,/<label for="[^"]+">Ordenar fila completa<\/label><select id="[^"]+"/)
})
