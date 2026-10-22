import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,Dialog,Context
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/refinements-d',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Dialog=(await server.ssrLoadModule('/src/features/shorts/components/ShortSequenceDialog.tsx')).ShortSequenceDialog;Context=(await server.ssrLoadModule('/src/features/admin/context/admin-session-context.ts')).AdminContext})
after(async()=>server?.close())
test('título integral fica após player/fonte, cabeçalho é estável e encerramento visual antigo desaparece',()=>{
 for(const title of ['Jogada curta','Título longo '.repeat(30)]){
 const short={id:'short',identity:'YouTube:abcdefghijk',url:'https://www.youtube.com/shorts/abcdefghijk',platform:'YouTube',title,gameId:'game',createdAt:1}
 const output=render(h(Context.Provider,{value:{user:null,authorized:false}},h(Dialog,{short,items:[short],onNavigate(){},onClose(){},onLikeCount(){},onModerated(){}})))
 assert.ok(output.includes('Visualizador de short'));assert.ok(output.indexOf('Assistir na plataforma')<output.indexOf(title));assert.ok(output.indexOf(title)<output.indexOf('Comentários publicados'));assert.ok(output.includes('A sequência usa somente'))
 assert.ok(!output.includes('Encerrar player'));assert.ok(!output.includes('Se o vídeo não iniciar'));assert.ok(!output.includes('<iframe'))
 }
})
