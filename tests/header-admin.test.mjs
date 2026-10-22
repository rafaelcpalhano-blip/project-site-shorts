import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,Layout,Context
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/header-admin',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 Layout=(await server.ssrLoadModule('/src/components/layout/SiteLayout.tsx')).SiteLayout
 Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext
})
after(async()=>server?.close())
function html(state,path='/') {
 return render(h(MemoryRouter,{initialEntries:[path]},h(Context.Provider,{value:{user:null,authorized:false,checking:false,...state}},h(Layout))))
}
test('Administrar só aparece para usuário com autorização confirmada e fora da verificação',()=>{
 for(const state of [{},{user:{uid:'connected'}},{user:{uid:'connected'},checking:true},{user:{uid:'owner'},authorized:true,checking:true},{authorized:true}])assert.doesNotMatch(html(state),/>Administrar</)
 assert.match(html({user:{uid:'owner'},authorized:true}),/href="\/admin"[^>]*>Administrar<\/a>/)
})
test('acesso é um link interno sem login público, dados pessoais ou identificadores',()=>{
 const result=html({user:{uid:'private-owner-id'},authorized:true})
 assert.match(result,/class="primary [^"]+"[^>]*href="\/admin"/)
 assert.doesNotMatch(result,/private-owner-id|Entrar com Google|target="_blank"|onclick=/)
 assert.match(result,/Clipzone — página inicial/)
})
test('página administrativa marca link atual; perder autorização remove o acesso visual',()=>{
 assert.match(html({user:{uid:'owner'},authorized:true},'/admin'),/aria-current="page"/)
 assert.doesNotMatch(html({user:{uid:'owner'},authorized:false}),/>Administrar</)
})
