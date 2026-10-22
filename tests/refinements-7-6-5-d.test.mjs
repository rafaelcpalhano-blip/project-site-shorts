import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,Filters,Order,panels
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/refinements-d',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 const load=path=>server.ssrLoadModule('/src/features/admin/components/'+path+'.tsx')
 Filters=(await load('AdminFilters')).AdminFilters;Order=(await load('AdminOrder')).AdminOrder
 panels=await Promise.all(['GameCatalogPanel','GameRequestPanel','CommentModerationPanel','ModerationPanel'].map(async name=>(await load(name))[name]))
})
after(async()=>server?.close())
test('quatro seções conservam ordenações, refresh, seleção e descrições associadas a cada filtro',()=>{
 const sizes=[5,3,4,3]
 panels.forEach((Panel,index)=>{
  const html=render(h(MemoryRouter,null,h(Panel,{user:{uid:'admin'},onUnauthorized:()=>{}})))
  assert.equal((html.match(/aria-describedby=/g)||[]).length,sizes[index])
  const ids=[...html.matchAll(/aria-describedby="([^"]+)"/g)].map(match=>match[1])
  for(const id of ids)assert.ok(html.includes('id="'+id+'"'))
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1)
  for(const value of ['date-desc','date-asc','text-asc','text-desc'])assert.ok(html.includes('value="'+value+'"'))
  assert.match(html,/aria-label="Atualizar/)
  assert.ok(html.indexOf('aria-pressed=')<html.indexOf('Ordenar fila completa'))
 })
})
test('filtros desabilitados preservam leitura e ids únicos entre instâncias',()=>{
 const props={labels:{all:'Todos',active:'Ativos'},descriptions:{all:'Todos os registros',active:'Somente ativos'},value:'active',disabled:true,onChange:()=>{},order:h(Order,{value:'date-desc',disabled:true,textLabel:'Nome',dateLabel:'Data',onChange:()=>{}}),refresh:null}
 const html=render(h('div',null,h(Filters,props),h(Filters,props)))
 assert.equal((html.match(/<button[^>]*disabled=""/g)||[]).length,4)
 const ids=[...html.matchAll(/aria-describedby="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,4)
 assert.equal(html.split('>Somente ativos<').length-1,2)
})
