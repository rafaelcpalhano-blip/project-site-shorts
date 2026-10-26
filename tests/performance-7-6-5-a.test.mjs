import {test} from 'node:test'
import assert from 'node:assert/strict'
import {updateItemLikeCount,updatePageLikeCount} from '../src/features/shorts/services/feed-like-count.ts'
import {createPublicReadClient} from '../src/lib/firebase/public-read-api.ts'
test('contagem idêntica ou ID ausente preservam página, seleção e referências',()=>{
 const selected=Object.freeze({id:'one',likeCount:3}),page=Object.freeze({items:Object.freeze([selected,Object.freeze({id:'two',likeCount:0})]),next:'cursor',limited:true});assert.equal(updatePageLikeCount(page,'one',3),page);assert.equal(updatePageLikeCount(page,'missing',5),page);assert.equal(updateItemLikeCount(selected,'one',3),selected);assert.equal(updateItemLikeCount(selected,'two',5),selected)
})
test('mudança real atualiza somente o item, preservando ordem, cursor e demais dados',()=>{
 const page={items:[{id:'one',likeCount:3,title:'Primeiro'},{id:'two',likeCount:1,title:'Segundo'}],next:'cursor',order:'likes',limited:false},result=updatePageLikeCount(page,'one',2);assert.notEqual(result,page);assert.equal(result.items[1],page.items[1]);assert.deepEqual(result.items.map(item=>item.id),['one','two']);assert.equal(result.items[0].likeCount,2);assert.equal(page.items[0].likeCount,3);assert.equal(result.next,'cursor');assert.equal(result.order,'likes');assert.equal(result.items[0].title,'Primeiro')
})
test('contagem ainda ausente passa a exibir zero sem descartar metadados',()=>{
 const row={id:'one',title:'Título'};assert.deepEqual(updateItemLikeCount(row,'one',0),{...row,likeCount:0})
})
test('comentários com sinal já cancelado não iniciam sessão nem consulta',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;const reads=createPublicReadClient(async()=>{calls++;throw Error('não executar')});await assert.rejects(reads.listComments('short',undefined,controller.signal),error=>error.name==='AbortError');assert.equal(calls,0)
})
test('cancelamento durante sessão impede leitura mesmo se o transporte entregar resposta atrasada',async()=>{
 const controller=new AbortController(),calls=[];let resolveSession,sessionStarted;const started=new Promise(resolve=>sessionStarted=resolve);const reads=createPublicReadClient(async(path,options)=>{calls.push(path);assert.equal(options.credentials,'same-origin');return new Promise(resolve=>{resolveSession=resolve;sessionStarted()})});const pending=reads.listComments('short',undefined,controller.signal);await started;const rejected=assert.rejects(pending,error=>error.name==='AbortError');controller.abort();resolveSession(new Response(null,{status:204}));await rejected;assert.deepEqual(calls,['/api/session'])
})
test('cancelamento da leitura chega ao transporte e não produz nova tentativa automática',async()=>{
 const controller=new AbortController(),calls=[];let cancelRead;const reads=createPublicReadClient(async(path,options)=>{calls.push(path);if(path==='/api/session')return new Response(null,{status:204});return new Promise((resolve,reject)=>{void resolve;cancelRead=()=>controller.abort();options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});cancelRead()})});await assert.rejects(reads.listComments('short',undefined,controller.signal),error=>error.name==='AbortError');assert.deepEqual(calls,['/api/session','/api/comments/list'])
})
test('leitura normal mantém cursor, validação, sessão e resposta sem consultar dados adicionais',async()=>{
 const cursor={id:'c1',time:'2026-10-22T00:00:00.000Z',scope:'comments:short'},calls=[],controller=new AbortController();const reads=createPublicReadClient(async(path,options)=>{calls.push(path);if(path==='/api/session')return new Response(null,{status:204});assert.deepEqual(JSON.parse(options.body),{shortId:'short',cursor});assert.equal(options.signal.aborted,false);return Response.json({items:[{id:'c2',content:'Texto',createdAt:1}],next:null})});assert.deepEqual(await reads.listComments('short',cursor,controller.signal),{items:[{id:'c2',content:'Texto',createdAt:1}],next:null});assert.equal(calls.length,2)
})
