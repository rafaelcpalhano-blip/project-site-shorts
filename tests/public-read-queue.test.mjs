import test from 'node:test'
import assert from 'node:assert/strict'
import {coordinatePublicRead} from '../src/lib/http/public-read-queue.ts'
import {createPublicReadClient} from '../src/lib/firebase/public-read-api.ts'
import {createOrderedFeedClient} from '../src/features/shorts/services/ordered-feed-api.ts'
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
test('leituras do mesmo transporte são coordenadas; nenhuma leitura é omitida ou repetida',async()=>{
 const transport=async()=>{},first=deferred(),events=[],signal=new AbortController().signal
 const a=coordinatePublicRead(transport,signal,async()=>{events.push('a-start');await first.promise;events.push('a-end');return 1})
 const b=coordinatePublicRead(transport,signal,async()=>{events.push('b');return 2})
 await Promise.resolve();assert.deepEqual(events,['a-start']);first.resolve();assert.deepEqual(await Promise.all([a,b]),[1,2]);assert.deepEqual(events,['a-start','a-end','b'])
})
test('falha não envenena fila e próxima tentativa manual continua; transportes são independentes',async()=>{
 const transport=async()=>{},signal=new AbortController().signal,gate=deferred()
 const a=coordinatePublicRead(transport,signal,()=>gate.promise);const failure=assert.rejects(a,/offline/)
 const b=coordinatePublicRead(transport,signal,async()=>7)
 assert.equal(await coordinatePublicRead(async()=>{},signal,async()=>9),9)
 gate.reject(Error('offline'));await failure;assert.equal(await b,7);assert.equal(await coordinatePublicRead(transport,signal,async()=>11),11)
})
test('cancelamento na espera rejeita imediatamente e não envia a operação nem libera a anterior',async()=>{
 const transport=async()=>{},signal=new AbortController().signal,gate=deferred(),cancel=new AbortController();let sent=0,thirdStarted=false
 const a=coordinatePublicRead(transport,signal,()=>gate.promise)
 const b=coordinatePublicRead(transport,cancel.signal,async()=>{sent++;return 2});const rejected=assert.rejects(b,{name:'AbortError'});cancel.abort();await rejected
 const c=coordinatePublicRead(transport,signal,async()=>{thirdStarted=true;return 3});await Promise.resolve();assert.equal(thirdStarted,false)
 gate.resolve(1);assert.equal(await a,1);assert.equal(await c,3);assert.equal(sent,0)
})
test('cancelar uma operação ativa não sobrepõe a próxima enquanto o transporte ainda não terminou',async()=>{
 const transport=async()=>{},cancel=new AbortController(),gate=deferred();let started=false
 const a=coordinatePublicRead(transport,cancel.signal,()=>gate.promise);const rejected=assert.rejects(a,{name:'AbortError'});await Promise.resolve();cancel.abort();await rejected
 const b=coordinatePublicRead(transport,new AbortController().signal,async()=>{started=true;return 2});await Promise.resolve();assert.equal(started,false);gate.resolve(1);assert.equal(await b,2)
})
test('catálogo e feed reais compartilham fila, preservam POST/cookies/sessão e validam cada resposta',async()=>{
 const gate=deferred(),events=[]
 const transport=async(path,options)=>{
  assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');events.push(path)
  if(path==='/api/session')return new Response(null,{status:204})
  if(path==='/api/games/list'){await gate.promise;return Response.json({items:[{id:'game',name:'Jogo'}],next:null})}
  return Response.json({items:[],next:null,order:'latest',orderingAt:new Date().toISOString(),limited:false,candidatesRead:0,candidatesExamined:0})
 }
 const catalog=createPublicReadClient(transport),feed=createOrderedFeedClient(transport)
 const games=catalog.listGames(),shorts=feed('latest');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['/api/session','/api/games/list'])
 gate.resolve();assert.equal((await games).items[0].id,'game');assert.equal((await shorts).items.length,0);assert.deepEqual(events,['/api/session','/api/games/list','/api/session','/api/feed/ordered'])
})
test('429 mantém erro de proteção, não repete nem impede próxima leitura válida',async()=>{
 let calls=0;const transport=async path=>{calls++;return path==='/api/session'?new Response(null,{status:204}):calls===2?new Response(null,{status:429}):Response.json({items:[],next:null})}
 const client=createPublicReadClient(transport);await assert.rejects(client.listGames(),e=>e.kind==='rate-limit');assert.equal(calls,2);assert.equal((await client.listGames()).items.length,0);assert.equal(calls,4)
})
