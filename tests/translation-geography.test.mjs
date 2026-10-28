import test from 'node:test'
import assert from 'node:assert/strict'
import {createDescriptionTranslator} from '../server/games/translate-description.ts'

function translator(transform){
 return createDescriptionTranslator({accountId:'a'.repeat(32),token:'fixture-only'},async(_url,init)=>{
  const request=JSON.parse(init.body),description=JSON.parse(request.messages[1].content).description
  return Response.json({success:true,result:{response:transform(description)}})
 })
}

test('geographical phrases remain available for localization while Tibia is protected and server counts retain their associations',async()=>{
 const input={officialName:'Tibia',aliases:[],description:'Tibia is an MMORPG with 68 servers: 24 in Europe, 25 in North America and 19 in South America.'}
 const translate=translator(source=>{
  assert.ok(!source.includes('Tibia'))
  assert.ok(source.includes('25 in North America'));assert.ok(source.includes('19 in South America'))
  return source.replace('is an MMORPG with','é um MMORPG com').replace('servers:','servidores:').replace('24 in Europe','24 na Europa').replace('25 in North America','25 na América do Norte').replace('and 19 in South America','e 19 na América do Sul')
 })
 assert.equal(await translate(input),'Tibia é um MMORPG com 68 servidores: 24 na Europa, 25 na América do Norte e 19 na América do Sul.')
})

test('longer brand names containing geographical words are still protected',async()=>{
 const input={officialName:'Portal',aliases:[],description:'Portal was developed by North America Studios for players in South America.'}
 const translate=translator(source=>{
  assert.ok(!source.includes('Portal'));assert.ok(!source.includes('North America Studios'))
  assert.ok(source.includes('South America'))
  return source.replace('was developed by','foi desenvolvido pela').replace('for players in South America','para jogadores na América do Sul')
 })
 assert.equal(await translate(input),'Portal foi desenvolvido pela North America Studios para jogadores na América do Sul.')
})

test('explicit official title and aliases override geographical localization',async()=>{
 const input={officialName:'North America',aliases:['United Kingdom'],description:'North America is also called United Kingdom and takes place in South America.'}
 const translate=translator(source=>{
  assert.ok(!source.includes('North America'));assert.ok(!source.includes('United Kingdom'))
  assert.ok(source.includes('South America'))
  return source.replace('is also called','também é chamado de').replace('and takes place in South America','e se passa na América do Sul')
 })
 assert.equal(await translate(input),'North America também é chamado de United Kingdom e se passa na América do Sul.')
})

test('geography refinement never permits lost or duplicated protected brand markers',async()=>{
 const input={officialName:'Portal',aliases:[],description:'Portal was developed by North America Studios for South America.'}
 await assert.rejects(translator(()=> 'Portal foi desenvolvido por uma empresa para a América do Sul.')(input),/translation-name-mismatch/)
 await assert.rejects(translator(source=>source+' '+source)(input),/translation-name-mismatch/)
})
