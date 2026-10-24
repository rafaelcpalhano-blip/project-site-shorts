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

test('rodapé mantém orientação, contato oficial e balões acessíveis sem direitos enganosos',()=>{
 const result=html({})
 const footer=result.match(/<footer[\s\S]*?<\/footer>/)?.[0]
 assert.ok(footer)
 assert.equal((footer.match(/aria-label="Trocar mensagem:/g)||[]).length,4)
 assert.match(footer,/Fazer cócegas no Clipper/)
 assert.match(footer,/Solicite a inclusão ao compartilhar um short/)
 assert.match(footer,/href="mailto:clipzone.suporte@gmail.com"/)
 assert.doesNotMatch(footer,/endereço de demonstração, ainda indisponível/)
 assert.match(footer,/respectivos titulares/);assert.match(footer,/Como os vídeos funcionam/);assert.match(footer,/contagem de visualizações segue as regras de cada plataforma/);assert.match(footer,/sem incentivar visualizações artificiais/)
 assert.match(footer,/loading="lazy"/)
 assert.match(footer,/alt=""/)
 assert.doesNotMatch(footer,/teste\.suporte@clipzone\.com|©|copyright/i)
})

test('rodapé público não aparece na administração, inclusive barra final e subrotas',()=>{
 for(const path of ['/admin','/admin/','/admin?retorno=1','/admin/revisao']){const result=html({},path);assert.doesNotMatch(result,/<footer|Como os vídeos funcionam|teste\.suporte@clipzone\.com/)}
 for(const path of ['/','/jogos/manual-test','/caminho-inexistente'])assert.match(html({},path),/<footer/)
})
