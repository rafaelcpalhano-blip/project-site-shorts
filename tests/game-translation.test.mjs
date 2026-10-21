import test from 'node:test'
import assert from 'node:assert/strict'
import {createDescriptionTranslator,TRANSLATION_MODEL} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
import {confirmGame} from '../server/games/confirm-game.ts'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
const game={externalId:'1',source:'IGDB',officialName:'Portal',description:'Portal is a puzzle game made by Valve.',aliases:['Valve'],status:'active'}
const now=()=>new Date('2026-10-21T15:00:00Z'),accountId='a'.repeat(32)
function memory(){
 const records=new Map([['games/igdb-1',structuredClone(game)]]);let tail=Promise.resolve()
 const store={transact(work){const result=tail.then(async()=>{const writes=new Map();const result=await work({get:async path=>{assert.equal(writes.size,0);return structuredClone(records.get(path)??null)},set:(path,value)=>writes.set(path,value),create:(path,value)=>{assert.ok(!records.has(path));writes.set(path,value)}});for(const [path,value] of writes)records.set(path,value);return result});tail=result.catch(()=>{});return result}}
 return {store,records,now}
}
function translatedBody(init){const data=JSON.parse(init.body);return JSON.parse(data.messages[1].content).description.replace('is a puzzle game made by','é um jogo de quebra-cabeça criado pela')}
const service=(deps,translate,patch={})=>createGameTranslation({...deps,translate,maximumPerDay:20,...patch})

test('adaptador usa endpoint/modelo fixos, segredo apenas no cabeçalho e preserva nomes protegidos',async()=>{
 let call
 const translate=createDescriptionTranslator({accountId,token:'private-token'},async(url,init)=>{call={url,init};return Response.json({success:true,result:{response:translatedBody(init)}})})
 assert.equal(await translate(game),'Portal é um jogo de quebra-cabeça criado pela Valve.')
 assert.equal(call.url,'https://api.cloudflare.com/client/v4/accounts/'+accountId+'/ai/run/'+TRANSLATION_MODEL)
 assert.equal(call.init.redirect,'error');assert.equal(call.init.headers.Authorization,'Bearer private-token');assert.ok(!call.init.body.includes('private-token'))
 assert.ok(!JSON.parse(call.init.body).messages[1].content.includes('Valve'))
 const regexGame={description:'C++ and Game (HD) are games.',officialName:'C++',aliases:['Game (HD)']}
 const special=createDescriptionTranslator({accountId,token:'token'},async(url,init)=>Response.json({success:true,result:{response:JSON.parse(JSON.parse(init.body).messages[1].content).description.replace('and','e').replace('are games','são jogos')}}))
 assert.equal(await special(regexGame),'C++ e Game (HD) são jogos.')
 const proper={description:'Portal uses the Aperture Science Handheld Portal Device in its puzzles.',officialName:'Portal',aliases:[]}
 const protect=createDescriptionTranslator({accountId,token:'token'},async(url,init)=>{
  const source=JSON.parse(JSON.parse(init.body).messages[1].content).description
  assert.ok(!source.includes('Aperture Science Handheld Portal Device'))
  return Response.json({success:true,result:{response:source.replace('uses the','usa o').replace('in its puzzles','em seus desafios')}})
 })
 assert.equal(await protect(proper),'Portal usa o Aperture Science Handheld Portal Device em seus desafios.')
})
test('adaptador rejeita hosts configuráveis, respostas inválidas, marcadores perdidos, HTML e falhas do provedor',async()=>{
 assert.throws(()=>createDescriptionTranslator({accountId:'../evil',token:'token'}))
 for(const reply of [()=>new Response('',{status:429}),()=>Response.json({success:false,result:{response:'texto'}}),()=>Response.json({success:true,result:{response:'Tradução sem nomes.'}}),()=>Response.json({success:true,result:{response:'<script>alert(1)</script>'}}),()=>new Response('x'.repeat(100001))]){
  await assert.rejects(createDescriptionTranslator({accountId,token:'token'},async()=>reply())(game))
 }
 let calls=0;const translate=createDescriptionTranslator({accountId,token:'token'},async()=>{calls++;throw new Error('not expected')})
 await assert.rejects(translate({...game,description:'x'.repeat(8001)}));assert.equal(calls,0)
})
test('tradução concorrente executa uma vez, preserva original e reutiliza resultado salvo',async()=>{
 const deps=memory();let calls=0
 const translate=service(deps,async()=>{calls++;return 'Portal é um jogo de quebra-cabeça criado pela Valve.'})
 await Promise.all([translate('igdb-1'),translate('igdb-1'),translate('igdb-1')]);await translate('igdb-1')
 assert.equal(calls,1);const saved=deps.records.get('games/igdb-1')
 assert.equal(saved.description,game.description);assert.equal(saved.officialName,game.officialName);assert.equal(saved.translation.locale,'pt-BR')
 assert.ok(mapGameDetails('igdb-1',saved).descriptionPtBr)
 assert.equal(deps.records.get('translationUsage/2026-10-21').count,1)
 assert.ok(![...deps.records.keys()].some(path=>path.startsWith('submissionLimits/')))
})
test('mudança do original impede escrita antiga e torna tradução anterior invisível até atualizar',async()=>{
 const deps=memory()
 await service(deps,async()=> 'Portal é um jogo da Valve.')('igdb-1')
 deps.records.get('games/igdb-1').description='Portal has new description.'
 assert.equal(mapGameDetails('id',deps.records.get('games/igdb-1')).descriptionPtBr,null)
 const later=deps // A completed lease must not postpone a changed source.
 await service(later,async()=>{deps.records.get('games/igdb-1').description='Changed during call';return 'Tradução antiga não deve substituir a nova descrição.'})('igdb-1')
 assert.equal(deps.records.get('gameTranslations/igdb-1').status,'stale')
 assert.equal(deps.records.get('games/igdb-1').translation.sourceDescription,game.description)
 assert.equal(mapGameDetails('id',deps.records.get('games/igdb-1')).descriptionPtBr,null)
})
test('falha mantém original, resiste a repetição, limita três tentativas por versão e vinte por dia',async()=>{
 const deps=memory();let calls=0
 const failure=async()=>{calls++;throw new Error('private provider response')}
 for(let hour=0;hour<5;hour++)await service({...deps,now:()=>new Date(now().getTime()+hour*3600000)},failure)('igdb-1')
 assert.equal(calls,3)
 await service({...deps,now:()=>new Date('2026-10-22T15:00:00Z')},failure)('igdb-1');assert.equal(calls,4)
 assert.equal(deps.records.get('games/igdb-1').description,game.description)
 assert.equal(deps.records.get('games/igdb-1').translation,undefined)
 const capped=memory();let cappedCalls=0
 const run=service(capped,async()=>{cappedCalls++;return 'Portal é um jogo.'},{maximumPerDay:1})
 capped.records.set('games/igdb-2',{...game,externalId:'2'});await run('igdb-1');await run('igdb-2');assert.equal(cappedCalls,1)
 assert.throws(()=>service(capped,async()=>'',{maximumPerDay:21}))
})
test('jogo desativado durante chamada não recebe tradução; lease antigo não sobrescreve novo trabalho',async()=>{
 const deps=memory()
 await service(deps,async()=>{deps.records.get('games/igdb-1').status='disabled';return 'Portal é um jogo.'})('igdb-1')
 assert.equal(deps.records.get('games/igdb-1').translation,undefined)
 const another=memory()
 await service(another,async()=>{another.records.get('gameTranslations/igdb-1').leaseId='new-owner';return 'Portal é um jogo.'})('igdb-1')
 assert.equal(another.records.get('games/igdb-1').translation,undefined)
})
test('confirmação permite tradução opcional de jogo existente ou novo e falha não desfaz cadastro',async()=>{
 const deps=memory();let calls=0
 const get=async()=>({...game,genres:[],gameModes:[],platforms:[],releaseDate:null,imageUrl:null,sourceUrl:null})
 const options={...deps,get,translateGame:async id=>{assert.equal(id,'igdb-1');calls++;throw new Error('unavailable')}}
 assert.equal((await confirmGame({externalId:'1'},options)).created,false)
 const fresh=memory();fresh.records.clear();assert.equal((await confirmGame({externalId:'1'},{...options,store:fresh.store})).created,true)
 assert.equal(calls,2);assert.equal(fresh.records.get('games/igdb-1').description,game.description)
})
test('ficha exige tradução vinculada ao original e ao nome atuais; metadados antigos permanecem válidos',()=>{
 assert.equal(mapGameDetails('id',game).descriptionPtBr,null)
 for(const translation of [{text:'Português',locale:'pt-BR',sourceDescription:'outro',sourceName:'Portal'},{text:'Português',locale:'pt',sourceDescription:game.description,sourceName:'Portal'},{text:'',locale:'pt-BR',sourceDescription:game.description,sourceName:'Portal'}])assert.equal(mapGameDetails('id',{...game,translation}).descriptionPtBr,null)
 assert.equal(mapGameDetails('id',{...game,translation:{text:'Português',locale:'pt-BR',sourceDescription:game.description,sourceName:'Portal'}}).descriptionPtBr,'Português')
})
