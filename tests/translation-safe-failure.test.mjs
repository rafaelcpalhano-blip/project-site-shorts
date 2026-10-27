import test from 'node:test'
import assert from 'node:assert/strict'
import {createDescriptionTranslator,translationFailureDetails} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
const game={source:'IGDB',status:'active',officialName:'Tibia',description:'Tibia is a fantasy game.',aliases:[]}
const privateText='private-provider-body-and-token-should-not-be-persisted'
function memory(){let time=Date.parse('2026-10-27T12:00:00Z');const rows=new Map([['games/igdb-9596',structuredClone(game)]]),store={transact:async work=>work({get:async p=>rows.get(p)??null,set:(p,v)=>rows.set(p,v)})};return {rows,store,now:()=>new Date(time),advance:ms=>{time+=ms}}}

test('private translation failure records only fixed category and trusted HTTP status, never provider text or forged fields',async()=>{
 const scenarios=[
  [async()=>new Response(privateText,{status:429}),{code:'translation-unavailable',providerStatus:429}],
  [async()=>new Response(privateText,{status:403}),{code:'translation-unavailable',providerStatus:403}],
  [async()=>new Response(privateText),{code:'invalid-translation-response-json'}],
  [async()=>Response.json({success:true,result:{choices:[],object:'chat.completion'}}),{code:'invalid-translation-response-shape'}],
  [async()=>Response.json({success:true,result:{object:'chat.completion',choices:[{index:0,finish_reason:'length',message:{role:'assistant',content:privateText}}]}}),{code:'invalid-translation-response-completion'}],
  [async()=>Response.json({success:true,result:{response:'<b>'+privateText+'</b>'}}),{code:'invalid-translation-text'}],
  [async()=>{throw Object.assign(new Error(privateText),{status:403})},{code:'translation-unavailable'}],
 ]
 for(const [fetcher,expected] of scenarios){
  const d=memory(),translate=createDescriptionTranslator({accountId:'a'.repeat(32),token:privateText},fetcher)
  await createGameTranslation({...d,translate,maximumPerDay:20})('igdb-9596')
  assert.deepEqual(d.rows.get('gameTranslations/igdb-9596').failure,expected)
  assert.equal(d.rows.get('gameTranslations/igdb-9596').status,'failed');assert.equal(d.rows.get('games/igdb-9596').description,game.description)
  assert.ok(!JSON.stringify([...d.rows]).includes(privateText))
 }
 assert.deepEqual(translationFailureDetails(Object.assign(new Error(privateText),{name:'TimeoutError'})),{code:'translation-timeout'})
 assert.deepEqual(translationFailureDetails({message:privateText,status:429}),{code:'translation-unavailable'})
})

test('safe failure metadata preserves cooldown and budget and disappears after a later successful lease',async()=>{
 const d=memory();let calls=0
 const translate=createDescriptionTranslator({accountId:'a'.repeat(32),token:privateText},async(_url,init)=>{
  if(++calls===1)return new Response(privateText,{status:429})
  const source=JSON.parse(JSON.parse(init.body).messages[1].content).description
  return Response.json({success:true,result:{response:source.replace('is a fantasy game.','é um jogo de fantasia.')}})
 })
 const run=createGameTranslation({...d,translate,maximumPerDay:20})
 await run('igdb-9596');await run('igdb-9596');assert.equal(calls,1)
 const failed=d.rows.get('gameTranslations/igdb-9596');assert.equal(failed.retryAt.getTime()-d.now().getTime(),3600000)
 assert.equal(d.rows.get('translationUsage/2026-10-27').count,1)
 d.advance(3600000);await run('igdb-9596')
 assert.equal(calls,2);assert.equal(d.rows.get('gameTranslations/igdb-9596').status,'ready')
 assert.equal(d.rows.get('gameTranslations/igdb-9596').failure,undefined)
 assert.equal(d.rows.get('games/igdb-9596').translation.text,'Tibia é um jogo de fantasia.')
})
