import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,Row,Context
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/catalog-row',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Row=(await server.ssrLoadModule('/src/features/admin/components/CatalogGameRow.tsx')).CatalogGameRow;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-bulk-context.ts')).AdminBulkContext})
after(async()=>server?.close())
const base={id:'manual-test',name:'Jogo de teste',source:'manual',status:'active',provisional:true,createdAt:null,revision:1}
const bulk={busy:false,items:[],completed:new Set(),toggle:async()=>{},clear(){}}
const html=(game,disabled=false)=>render(h(MemoryRouter,null,h(Context.Provider,{value:bulk},h(Row,{game,disabled,onChoose(){},onInspect(){}}))))
test('ativos oficiais, manuais e provisórios possuem consulta pública separada das ações',()=>{
 for(const game of [base,{...base,provisional:false},{...base,id:'igdb-123',source:'IGDB',provisional:false}]){const result=html(game);assert.match(result,new RegExp('href="/jogos/'+game.id+'"[^>]*>Consultar jogo</a>'));assert.match(result,/>Detalhes administrativos</);assert.ok(result.indexOf('type="checkbox"')<result.indexOf('<strong>Jogo de teste'));assert.ok(result.indexOf('<strong>Jogo de teste')<result.indexOf('>Consultar jogo</a>'));assert.ok(result.indexOf('>Consultar jogo</a>')<result.indexOf('>Detalhes administrativos</'));assert.ok(!result.includes('Somente na administração'))}
})
test('ocultos e banidos não ganham link público e preservam consulta administrativa',()=>{
 for(const status of ['hidden','banned']){const result=html({...base,status},true);assert.ok(!result.includes('href="/jogos/'));assert.match(result,/disabled="">Consultar jogo<\/button>/);assert.ok(result.includes('Somente na administração'));assert.match(result,/disabled="">Detalhes administrativos<\/button>/)}
})
test('nomes extensos são escapados e ausência de dados não bloqueia a consulta provisória',()=>{
 const result=html({...base,name:'Jogo <script> & '.repeat(6)});assert.ok(result.includes('&lt;script&gt;'));assert.ok(!result.includes('<script>'));assert.ok(result.includes('Data não informada'));assert.ok(result.includes('Provisório'));assert.ok(result.includes('>Consultar jogo</a>'))
})
