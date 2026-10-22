import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Comments,Context,Celebration
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/refinements-c',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 Comments=(await server.ssrLoadModule('/src/features/admin/components/CommentSelectionModeration.tsx')).CommentSelectionModeration
 Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext
 Celebration=(await server.ssrLoadModule('/src/features/comments/components/FirstCommentCelebration.tsx')).FirstCommentCelebration
})
after(async()=>server?.close())
const rows=[{id:'one',content:'Primeira mensagem <script>alert(1)</script>',createdAt:1,number:1},{id:'two',content:'Segunda mensagem',createdAt:2,number:2}]
const html=(comments,offset=0,authorized=false)=>render(h(Context.Provider,{value:{user:authorized?{uid:'admin'}:null,authorized}},h(Comments,{shortId:'video',comments,offset,disabled:false,onSelectionChange:()=>{},onBusyChange:()=>{},onRemoved:()=>{}})))
test('numeração persistida não depende da página, preservando escape do texto',()=>{
 const first=html(rows),second=html(rows,20)
 assert.ok(first.indexOf('Comentário #1')<first.indexOf('Comentário #2'))
 assert.ok(second.includes('Comentário #1'));assert.ok(second.includes('Comentário #2'));assert.ok(!second.includes('Comentário #21'))
 assert.ok(first.includes('&lt;script&gt;'));assert.ok(!first.includes('<script>'))
 assert.ok(!first.includes('Excluir comentários'));assert.ok(html(rows,20,true).includes('Excluir comentários'))
})
test('lista vazia não inventa comentário nem exige identidade',()=>{
 const output=html([]);assert.ok(output.includes('Nenhum comentário publicado'));assert.ok(!output.includes('Comentário #'));assert.ok(!output.includes('checkbox'))
})
test('celebração apresenta mensagem acessível e emojis somente decorativos',()=>{
 const output=render(h(Celebration));assert.ok(output.includes('role="status"'));assert.ok(output.includes('aria-hidden="true"'));assert.ok(output.includes('primeiro comentário'));assert.ok(!output.includes('<audio'));assert.ok(!output.includes('<button'))
})
