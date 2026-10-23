import test from 'node:test'
import assert from 'node:assert/strict'
import {createGameCatalogPageCache,invalidateGameCatalog,getGameCatalogVersion,subscribeGameCatalog} from '../src/features/games/services/catalog-cache.ts'
import {createGameCatalogClient} from '../src/features/games/services/catalog-api.ts'
import {moderateGame,saveManualGame} from '../src/features/admin/services/game-catalog-api.ts'

const game=id=>({id:String(id),name:'Jogo '+id})
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}

test('home e formulário compartilham leitura concorrente, com cópias independentes',async()=>{
 let calls=0;const response=deferred();const read=createGameCatalogPageCache(async()=>{calls++;return response.promise})
 const a=read(),b=read();await Promise.resolve();assert.equal(calls,1)
 response.resolve({items:[game(1)],next:null});const [first,second]=await Promise.all([a,b]);first.items[0].name='alterado'
 assert.equal(second.items[0].name,'Jogo 1');assert.equal((await read()).items[0].name,'Jogo 1');assert.equal(calls,1)
})

test('lista completa percorre 120 jogos e reutiliza todas as páginas sem limitar a seis/dez',async()=>{
 const all=Array.from({length:120},(_,i)=>game(i));let calls=0
 const read=createGameCatalogPageCache(async(cursor=0)=>{calls++;return {items:all.slice(cursor,cursor+50),next:cursor+50<all.length?cursor+50:null}})
 await read() // home
 async function full(){const items=[];let cursor;do{const page=await read(cursor);items.push(...page.items);cursor=page.next??undefined}while(cursor!==undefined);return items}
 assert.deepEqual(await full(),all);assert.equal(calls,3);assert.deepEqual(await full(),all);assert.equal(calls,3)
})

test('TTL de30s e invalidação explícita renovam o catálogo; erros nunca viram cache',async()=>{
 let time=0,calls=0,fail=false;const read=createGameCatalogPageCache(async()=>{calls++;if(fail)throw Error('offline');return {items:[game(calls)],next:null}},()=>time)
 await read();time=29999;await read();assert.equal(calls,1);time=30000;await read();assert.equal(calls,2)
 invalidateGameCatalog();fail=true;await assert.rejects(read(),/offline/);fail=false;await read();assert.equal(calls,4)
})

test('resposta iniciada antes da invalidação não repopula cache nem substitui resultado novo',async()=>{
 const old=deferred();let calls=0;const read=createGameCatalogPageCache(async()=>++calls===1?old.promise:{items:[game('novo')],next:null})
 const stale=read();await Promise.resolve();invalidateGameCatalog();assert.equal((await read()).items[0].id,'novo')
 old.resolve({items:[game('oculto')],next:null});await assert.rejects(stale,/catálogo mudou/);assert.equal((await read()).items[0].id,'novo');assert.equal(calls,2)
})

test('invalidação notifica consumidores montados e unsubscribe remove assinatura',()=>{
 let events=0;const initial=getGameCatalogVersion();const stop=subscribeGameCatalog(()=>events++)
 invalidateGameCatalog();assert.equal(getGameCatalogVersion(),initial+1);assert.equal(events,1);stop();invalidateGameCatalog();assert.equal(events,1)
})

test('inclusões manual/oficial e solicitação vinculada invalidam apenas após resposta válida',async()=>{
 let response;const client=createGameCatalogClient(async path=>path==='/api/session'?new Response(null,{status:204}):response)
 let version=getGameCatalogVersion();response=Response.json({game:game('manual-1'),created:true});await client.includeManual('Nome novo');assert.equal(getGameCatalogVersion(),++version)
 response=Response.json({id:'igdb-1',name:'Oficial'});await client.confirm('1');assert.equal(getGameCatalogVersion(),++version)
 response=Response.json({status:'linked',game:{id:'igdb-1',name:'Oficial'}});await client.request('Oficial');assert.equal(getGameCatalogVersion(),++version)
 response=Response.json({status:'pending',game:null});await client.request('Pendente');assert.equal(getGameCatalogVersion(),version)
 response=Response.json({error:'unavailable'},{status:503});await assert.rejects(client.confirm('1'));assert.equal(getGameCatalogVersion(),version)
})

test('edição e moderação inclusive bulk invalidam após sucesso; falhas não anunciam mudança',async()=>{
 const original=globalThis.fetch;const user={getIdToken:async()=>'fake-test-only'},detail={game:{id:'game',revision:1}}
 try{
  globalThis.fetch=async()=>Response.json({id:'game'});let version=getGameCatalogVersion()
  await moderateGame(user,detail,'hide','Razão de teste');assert.equal(getGameCatalogVersion(),++version)
  await saveManualGame(user,detail,{},'Razão de teste');assert.equal(getGameCatalogVersion(),++version)
  globalThis.fetch=async()=>Response.json({error:'stale-review'},{status:409});await assert.rejects(moderateGame(user,detail,'ban','Razão de teste'));assert.equal(getGameCatalogVersion(),version)
 }finally{globalThis.fetch=original}
})
