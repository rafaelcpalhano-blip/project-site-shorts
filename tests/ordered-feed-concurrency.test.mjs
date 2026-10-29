import test from 'node:test'
import assert from 'node:assert/strict'
import {readOrderedFeed} from '../server/ranking/read-feed.ts'
import {orderedFeedStore} from './helpers/ordered-feed-store.mjs'

for(const order of ['latest','oldest','likes','relevant'])test(order+': ordem, empate, filtro, paginação e DTO preservados com respostas fora de ordem',async()=>{
 for(const gameId of [undefined,'g1']){
  const d=orderedFeedStore({count:47,delay:path=>path.startsWith('shorts/')?Number(path.slice(-1))%3:1}),all=[];let cursor
  do{
   const before=d.stats.gets,page=await readOrderedFeed({order,gameId,...(cursor?{cursor}:{})},d)
   assert.ok(page.items.length<=15);assert.ok(page.candidatesRead<=30);assert.ok(d.stats.gets-before<=30+5+2)
   assert.ok(page.items.every(short=>short.gameName==='Jogo '+short.gameId.slice(1)&&short.commentCount!==undefined&&short.likeCount!==undefined))
   assert.ok(page.items.every(short=>!gameId||short.gameId===gameId));all.push(...page.items.map(short=>short.id));cursor=page.next??undefined
  }while(cursor)
  const rows=[...d.snapshots.values()][0],expected=(order==='relevant'?rows.slice(0,15):rows).map(row=>order==='relevant'?row.data.shortId:row.id)
  assert.deepEqual(all,expected);assert.equal(new Set(all).size,all.length);assert.ok(d.stats.maxActive>1&&d.stats.maxActive<=4)
 }
})

test('jogos repetidos compartilham promessa dentro da requisição, sem cache entre requisições',async()=>{
 const d=orderedFeedStore({count:15,delay:2});for(const [path,record]of d.docs)if(path.startsWith('shorts/'))record.gameId='g0'
 const first=await readOrderedFeed({},d);assert.equal(first.items.length,15);assert.equal(d.stats.paths.filter(path=>path==='games/g0').length,1);assert.equal(d.stats.gets,16);assert.ok(d.stats.maxActive<=4)
 d.docs.get('games/g0').status='banned';assert.equal((await readOrderedFeed({},d)).items.length,0);assert.equal(d.stats.paths.filter(path=>path==='games/g0').length,2)
})

test('segunda página de candidatos só consulta os slots restantes; âncora não pula registros',async()=>{
 const d=orderedFeedStore({count:35,delay:1}),get=d.store.get
 d.store.get=async path=>{if(path==='shorts/s014')return null;return get(path)}
 const first=await readOrderedFeed({},d)
 assert.equal(first.items.length,15);assert.equal(first.candidatesRead,30);assert.equal(first.candidatesExamined,16)
 assert.equal(d.stats.paths.filter(path=>path.startsWith('shorts/')).length,15) // +1 missing path handled above
 assert.equal(d.stats.queries.length,2);assert.equal(first.next.id,'s017');const second=await readOrderedFeed({cursor:first.next},d)
 assert.ok(second.items.every(item=>!first.items.some(previous=>previous.id===item.id)))
})

for(const order of ['latest','oldest','likes','relevant'])test(order+': revalida dados atuais de shorts e jogos, sem confiar no snapshot',async()=>{
 const d=orderedFeedStore({count:35,delay:1}),query=d.store.rankingPage
 d.store.rankingPage=async value=>{const page=await query(value);for(const [path,record]of d.docs)if(path.startsWith('shorts/')){const n=Number(path.slice(-3));if(n%5===0)record.moderationStatus='removed';if(n%5===1)record.gameId='g4'}d.docs.get('games/g2').status='hidden';d.docs.get('games/g3').status='banned';d.docs.get('games/g4').status='inactive';return page}
 const page=await readOrderedFeed({order},d);assert.ok(page.items.every(short=>short.gameId==='g0'||short.gameId==='g1'));assert.ok(page.items.every(short=>d.docs.get('shorts/'+short.id).moderationStatus==='published'));assert.equal(page.candidatesRead,order==='relevant'?15:30);assert.equal(page.candidatesExamined,order==='relevant'?15:30);assert.equal(page.limited,order!=='relevant');if(order==='relevant')assert.equal(page.next,null);else assert.ok(page.next)
})

test('todos invisíveis mantém limite30/continuação, sem inventar página vazia definitiva',async()=>{
 const d=orderedFeedStore({count:35,delay:1});for(let i=0;i<5;i++)d.docs.get('games/g'+i).status='hidden'
 const page=await readOrderedFeed({},d);assert.equal(page.items.length,0);assert.equal(page.candidatesRead,30);assert.equal(page.candidatesExamined,30);assert.equal(page.limited,true);assert.ok(page.next);assert.equal(d.stats.gets,35)
})

test('falha de leitura rejeita a página, não publica parcial nem dispara próxima janela',async()=>{
 const d=orderedFeedStore({delay:2}),get=d.store.get;d.store.get=async path=>{if(path==='shorts/s002')throw Error('injected-private-detail');return get(path)}
 await assert.rejects(readOrderedFeed({},d),/injected-private-detail/);await new Promise(resolve=>setTimeout(resolve,10));assert.ok(d.stats.paths.filter(path=>path.startsWith('shorts/')).length<=3);assert.equal(d.stats.pages,1)
})

test('entrada, cursor e ranking inválidos falham antes de consultas de candidatos',async()=>{
 const d=orderedFeedStore();for(const input of [{order:'bad'},{gameId:'../secret'},{cursor:{scope:'oldest:*',readTime:d.now().toISOString(),time:d.now().toISOString(),id:'s001'}},{cursor:{scope:'latest:*',readTime:new Date(d.now()-1800000).toISOString(),time:d.now().toISOString(),id:'s001'}}])await assert.rejects(readOrderedFeed(input,d))
 assert.equal(d.stats.pages,0);d.docs.get('rankingState/metrics').ready=false;await assert.rejects(readOrderedFeed({order:'relevant'},d),/not-ready/);assert.equal(d.stats.pages,0)
})
