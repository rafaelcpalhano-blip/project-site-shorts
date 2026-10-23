import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Welcome,Admin,Context,Modal
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/clipper-communication',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Modal=(await server.ssrLoadModule('/src/components/ui/Modal.tsx')).Modal;Welcome=(await server.ssrLoadModule('/src/components/clipper/ClipperWelcome.tsx')).ClipperWelcome;Admin=(await server.ssrLoadModule('/src/features/admin/pages/AdminPage.tsx')).AdminPage;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext})
after(async()=>server?.close())
test('boas-vindas usam diálogo sem X e com um único botão de explorar',()=>{
 const html=render(h(Welcome))
 assert.match(html,/<dialog[^>]*aria-labelledby=/);assert.equal((html.match(/<button/g)||[]).length,1);assert.doesNotMatch(html,/Fechar janela/);assert.match(render(h(Modal,{title:"Outro diálogo",onClose(){}})),/Fechar janela/);assert.match(html,/plataformas originais, em players oficiais/);assert.match(html,/Cada plataforma define como contabiliza as visualizações/);assert.match(html,/>Vamos explorar!<\/button>/)
 assert.match(html,/src="\/clipper\/welcome.webp"[^>]*alt=""/);assert.doesNotMatch(html,/toda reprodução|garantimos/i)
})
test('login conserva Google/erros e frase exata; recado some após autorização',()=>{
 const phrase='Estou online, totalmente operacional e, se me permite a audácia, torcendo pelo senhor como sempre.(J.A.R.V.I.S., 2013)'
 const base={auth:{},user:null,authorized:false,checking:false,error:'Erro de acesso de teste',initialize:async()=>{},verify:async()=>{},invalidate(){},beginSignIn(){},endSession:async()=>{}}
 const output=state=>render(h(Context.Provider,{value:{...base,...state}},h(Admin)))
 const html=output({});assert.ok(html.includes(phrase));assert.match(html,/src="\/clipper\/welcome.webp"[^>]*alt=""/);assert.ok(html.includes('Entrar com Google'));assert.ok(html.includes('Erro de acesso de teste'));assert.ok(!html.includes('teste.suporte@clipzone.com'));assert.ok(!output({authorized:true}).includes(phrase))
})
