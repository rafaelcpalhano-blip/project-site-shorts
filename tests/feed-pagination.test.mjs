import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {paginationWindow} from '../src/features/shorts/services/pagination-window.ts'
import {createCursorPages} from '../src/features/shorts/services/cursor-pages.ts'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Pagination
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/feed-pagination',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Pagination=(await server.ssrLoadModule('/src/features/shorts/components/FeedPagination.tsx')).FeedPagination})
after(async()=>server?.close())
test('janela mostra atual e até duas páginas de cada lado, inclusive início/fim e grande quantidade',()=>{
 assert.deepEqual(paginationWindow(0,3).pages,[0,1,2]);assert.deepEqual(paginationWindow(2,3).pages,[0,1,2])
 assert.deepEqual(paginationWindow(0,1000).pages,[0,1,2]);assert.deepEqual(paginationWindow(499,1000).pages,[497,498,499,500,501]);assert.deepEqual(paginationWindow(999,1000).pages,[997,998,999])
 for(const [index,count] of [[-1,4],[4,4],[0,0],[NaN,4]])assert.throws(()=>paginationWindow(index,count))
})
test('saltos aparecem apenas com destino disponível; limites exatos não inventam páginas',()=>{
 assert.equal(paginationWindow(4,10).previousJump,null);assert.equal(paginationWindow(5,10).previousJump,0)
 assert.equal(paginationWindow(0,5).nextJump,null);assert.equal(paginationWindow(0,6).nextJump,5)
 assert.equal(paginationWindow(8,10).nextJump,null);assert.equal(paginationWindow(0,1).previousJump,null)
})
test('janela não faz prefetch; salto disponível usa cursores/cache existentes sem perder filtros',async()=>{
 const calls=[],pager=createCursorPages(async cursor=>{const n=cursor??0;calls.push(n);return {items:[{id:'s'+n}],next:n<10?n+1:null}})
 await pager.load(0);assert.equal(paginationWindow(0,pager.knownCursors().length).nextJump,null);assert.deepEqual(calls,[0])
 for(let n=1;n<=5;n++)await pager.load(n)
 const window=paginationWindow(0,pager.knownCursors().length);assert.equal(window.nextJump,5)
 assert.equal((await pager.load(window.nextJump)).items[0].id,'s5');assert.deepEqual(calls,[0,1,2,3,4,5])
 const fresh=createCursorPages(async()=>({items:[],next:null}));await fresh.load(0);assert.equal(paginationWindow(0,fresh.knownCursors().length).nextJump,null)
})
test('controles são limitados, acessíveis e não oferecem salto impossível',()=>{
 const html=render(h(Pagination,{current:499,available:1000,canNext:true,onChange(){}}))
 assert.equal((html.match(/aria-label="Página /g)||[]).length,5);assert.match(html,/aria-current="page"/);assert.match(html,/Voltar 5 páginas, ir para a página 495/);assert.match(html,/Avançar 5 páginas, ir para a página 505/)
 const first=render(h(Pagination,{current:0,available:3,canNext:true,busy:true,onChange(){}}));assert.ok(!first.includes('5 páginas'));assert.ok(!/<button(?![^>]*disabled)/.test(first))
 const last=render(h(Pagination,{current:2,available:3,canNext:false,onChange(){}}));assert.match(last,/disabled="">Próxima/)
})
