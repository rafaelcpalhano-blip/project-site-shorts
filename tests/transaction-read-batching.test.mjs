import test from 'node:test'
import assert from 'node:assert/strict'
import {readTransactionPair} from '../server/firestore/transaction-reads.ts'
import {confirmGame} from '../server/games/confirm-game.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
const official={externalId:'1',officialName:'Portal',description:'Portal is a puzzle game.',aliases:[],genres:[],gameModes:[],platforms:[],releaseDate:null,imageUrl:null,sourceUrl:null}
function fixture(initial=new Map()){
 let time=Date.parse('2026-10-28T12:00:00Z'),calls=0
 const now=()=>new Date(time),f=restFixture(initial,now),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:f.fetcher,lazyTransactions:true})
 const translateGame=createGameTranslation({store,now,maximumPerDay:20,translate:async()=>{calls++;return 'Portal é um jogo de quebra-cabeça.'}})
 const confirm=()=>confirmGame({externalId:'1'},{store,now,get:async()=>structuredClone(official),translateGame})
 return {f,store,now,confirm,translateGame,calls:()=>calls,setTime:value=>{time=Date.parse(value)}}
}

test('transaction pair uses bounded same-transaction batch or ordered legacy reads',async()=>{
 let single=0,batches=0
 const result=await readTransactionPair({get:async()=>{single++;throw Error('unexpected')},getMany:async paths=>{batches++;assert.deepEqual(paths,['games/a','games/b']);return [{name:'A'},null]}},'games/a','games/b')
 assert.deepEqual(result,[{name:'A'},null]);assert.equal(single,0);assert.equal(batches,1)
 const paths=[];assert.deepEqual(await readTransactionPair({get:async path=>{paths.push(path);return path==='games/a'?{name:'A'}:null}},'games/a','games/b'),result)
 assert.deepEqual(paths,['games/a','games/b'])
})

test('failed or malformed batches never fall back to weaker independent reads',async()=>{
 for(const value of [[],[null],[null,null,null],[undefined,null],[[],null],null]){
  let singles=0
  await assert.rejects(readTransactionPair({get:async()=>{singles++;return null},getMany:async()=>value},'games/a','games/b'),/invalid-transaction-read-pair/)
  assert.equal(singles,0)
 }
 let singles=0;await assert.rejects(readTransactionPair({get:async()=>{singles++;return null},getMany:async()=>{throw Error('ABORTED')}},'games/a','games/b'),/ABORTED/);assert.equal(singles,0)
})

test('REST confirmation and translation use 9 requests then 6 with persistent cache, preserving names, original and quota',async()=>{
 const d=fixture(),first=await d.confirm()
 assert.equal(first.created,true);assert.equal(d.f.calls(),9);assert.equal(d.calls(),1)
 const original=structuredClone(d.f.docs.get('games/igdb-1')),budget=structuredClone(d.f.docs.get('translationUsage/2026-10-28')),before=d.f.calls()
 assert.equal((await d.confirm()).created,false);assert.equal(d.f.calls()-before,6);assert.equal(d.calls(),1)
 assert.deepEqual(d.f.docs.get('games/igdb-1'),original);assert.equal(original.description,official.description)
 assert.equal(original.translation.text,'Portal é um jogo de quebra-cabeça.');assert.deepEqual(d.f.docs.get('translationUsage/2026-10-28'),budget);assert.equal(budget.count,1)
 assert.equal([...d.f.docs.keys()].filter(path=>path.startsWith('gameNameKeys/')).length,2)
})

test('concurrent confirmations through real REST fixture still create once and infer once',async()=>{
 const d=fixture(),results=await Promise.all([d.confirm(),d.confirm()])
 assert.equal(results.filter(row=>row.created).length,1);assert.equal(d.calls(),1)
 assert.equal(d.f.docs.get('translationUsage/2026-10-28').count,1);assert.equal(d.f.docs.get('gameTranslations/igdb-1').status,'ready')
})

test('exhausted translation quota still confirms the game without calling the provider or altering the budget',async()=>{
 const initial=new Map([['translationUsage/2026-10-28',{count:20,updatedAt:new Date('2026-10-28T11:00:00Z')}]]),d=fixture(initial)
 assert.equal((await d.confirm()).created,true);assert.equal(d.calls(),0)
 assert.deepEqual(d.f.docs.get('translationUsage/2026-10-28'),initial.get('translationUsage/2026-10-28'))
 assert.equal(d.f.docs.get('games/igdb-1').description,official.description);assert.equal(d.f.docs.has('gameTranslations/igdb-1'),false)
})

test('claim binds task and budget to the same UTC day when the clock crosses midnight during the batch',async()=>{
 const game={...official,source:'IGDB',status:'active'},d=fixture(new Map([['games/igdb-1',game]]));d.setTime('2026-10-28T23:59:59.999Z')
 const original=d.store.transact.bind(d.store);let changed=false
 d.store.transact=work=>original(tx=>work({...tx,getMany:async paths=>{if(!changed&&paths.some(p=>p.startsWith('translationUsage/'))){changed=true;d.setTime('2026-10-29T00:00:00.001Z')}return tx.getMany(paths)}}))
 await d.translateGame('igdb-1');assert.equal(d.calls(),1)
 assert.equal(d.f.docs.get('gameTranslations/igdb-1').day,'2026-10-28');assert.equal(d.f.docs.get('translationUsage/2026-10-28').count,1)
 assert.equal(d.f.docs.has('translationUsage/2026-10-29'),false);assert.equal(d.f.docs.get('gameTranslations/igdb-1').status,'ready')
})
