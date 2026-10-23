import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
import {createPublicReadClient} from '../src/lib/firebase/public-read-api.ts'
import {createOrderedFeedClient} from '../src/features/shorts/services/ordered-feed-api.ts'
import {PublicReadFailure,readFailureMessage} from '../src/lib/http/read-failure.ts'
import {hasUnsavedViewerFields} from '../src/features/shorts/services/sequence-navigation.ts'
let server,Form
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/mobile-recovery',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});Form=(await server.ssrLoadModule('/src/features/comments/components/PersistentCommentForm.tsx')).PersistentCommentForm})
after(async()=>server?.close())
test('404 de comentários não exige JSON e conserva indisponibilidade distinta de rede',async()=>{
 const client=createPublicReadClient(async path=>path==='/api/session'?new Response(null,{status:204}):new Response('<html>not public</html>',{status:404}))
 await assert.rejects(client.listComments('short'),error=>error instanceof PublicReadFailure&&error.kind==='unavailable'&&error.message==='Conteúdo indisponível.')
})
test('falha da sessão impede leitura e não é classificada como vídeo indisponível',async()=>{
 const calls=[],client=createPublicReadClient(async path=>{calls.push(path);return new Response(null,{status:404})})
 await assert.rejects(client.listComments('short'),error=>error instanceof PublicReadFailure&&error.kind==='session')
 assert.deepEqual(calls,['/api/session'])
})
test('erro de transporte não repete consulta; próxima tentativa manual pode recuperar',async()=>{
 let broken=true;const calls=[],client=createPublicReadClient(async path=>{calls.push(path);if(path==='/api/session')return new Response(null,{status:204});if(broken)throw new TypeError('Failed to fetch');return Response.json({items:[],next:null,total:0})})
 await assert.rejects(client.listComments('short'),TypeError);assert.equal(calls.length,2)
 broken=false;assert.deepEqual(await client.listComments('short'),{items:[],next:null,total:0});assert.equal(calls.length,4)
})
test('429 mantém orientação de espera e não repete a leitura automaticamente',async()=>{
 let calls=0;const client=createPublicReadClient(async path=>{calls++;return path==='/api/session'?new Response(null,{status:204}):new Response('limited',{status:429})})
 await assert.rejects(client.listComments('short'),error=>error instanceof PublicReadFailure&&error.kind==='rate-limit'&&/Aguarde/.test(error.message));assert.equal(calls,2)
})
test('mensagens visíveis distinguem timeout/rede e não expõem exceções inesperadas',()=>{
 assert.match(readFailureMessage(new TypeError('Failed to fetch'),'fallback'),/Verifique sua conexão/)
 assert.match(readFailureMessage(new DOMException('internal','TimeoutError'),'fallback'),/demorou/)
 assert.equal(readFailureMessage(new SyntaxError('Unexpected token < secret'),'fallback'),'fallback')
 assert.equal(readFailureMessage(new Error('internal-secret'),'fallback'),'fallback')
})
test('ranking indisponível conserva orientação para outras ordenações',async()=>{
 const client=createOrderedFeedClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({error:'ranking-not-ready'},{status:503}))
 await assert.rejects(client('relevant'),error=>error instanceof PublicReadFailure&&/outras ordenações continuam disponíveis/.test(readFailureMessage(error,'fallback')))
})
test('formulário suspenso bloqueia envio e deixa textarea somente leitura para preservar rascunho e guarda de navegação',()=>{
 const html=renderToStaticMarkup(h(Form,{shortId:'short',disabled:false,suspended:true,onBusyChange(){},onPublished(){}}))
 assert.match(html,/<textarea[^>]*readOnly=""/i);assert.doesNotMatch(html,/<textarea[^>]*disabled/)
 assert.match(html,/<button[^>]*disabled=""/);assert.match(html,/Seu texto permanece aqui/)
 assert.equal(hasUnsavedViewerFields([{tagName:'TEXTAREA',type:'textarea',value:'Rascunho',disabled:false}]),true)
})
