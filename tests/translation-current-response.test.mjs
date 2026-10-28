import test from 'node:test'
import assert from 'node:assert/strict'
import {createDescriptionTranslator} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'

const input={description:'Tibia is a fantasy game.',officialName:'Tibia',aliases:[]}
function completed(content){return {object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content,reasoning_content:'Private reasoning must never be saved.'}}]}}
function translator(change=body=>body){return createDescriptionTranslator({accountId:'a'.repeat(32),token:'fixture-only'},async(_url,init)=>{
 const content=JSON.parse(JSON.parse(init.body).messages[1].content).description.replace('is a fantasy game.','é um jogo de fantasia.')
 return Response.json({success:true,result:change(completed(content))})
})}

test('current Qwen chat completion stores only final translated content, preserves names and reuses persistent cache',async()=>{
 const rows=new Map([['games/igdb-9596',{source:'IGDB',status:'active',description:input.description,officialName:input.officialName,aliases:[]}]])
 const store={transact:async work=>work({get:async p=>rows.get(p)??null,set:(p,d)=>rows.set(p,d)})}
 let calls=0;const actual=translator(),translate=async value=>{calls++;return actual(value)}
 const run=createGameTranslation({store,now:()=>new Date('2026-10-27T12:00:00Z'),translate,maximumPerDay:20})
 await run('igdb-9596');await run('igdb-9596')
 assert.equal(calls,1);assert.equal(rows.get('games/igdb-9596').translation.text,'Tibia é um jogo de fantasia.')
 assert.equal(rows.get('games/igdb-9596').description,input.description);assert.equal(rows.get('gameTranslations/igdb-9596').status,'ready')
 assert.equal(rows.get('translationUsage/2026-10-27').count,1)
})

test('chat completion refuses truncation, tools, refusal, ambiguous formats and unsupported message structures',async()=>{
 const changes=[
  body=>({...body,choices:[]}),body=>({...body,choices:[...body.choices,...body.choices]}),
  body=>({...body,response:'Ambiguous second response'}),body=>({...body,object:'text_completion'}),
  ...['length','content_filter','tool_calls',null,undefined].map(finish_reason=>body=>({...body,choices:[{...body.choices[0],finish_reason}]})),
  body=>({...body,choices:[{...body.choices[0],index:1}]}),
  ...[{role:'user'},{content:[{type:'text',text:'Unsupported structured answer'}]},{tool_calls:[{function:{name:'anything'}}]},{tool_calls:{}},{refusal:'Cannot answer'}].map(patch=>body=>({...body,choices:[{...body.choices[0],message:{...body.choices[0].message,...patch}}]})),
 ]
 for(const change of changes)await assert.rejects(translator(change)(input),/invalid-translation-response/)
})

test('chat completion still refuses HTML and lost protected names instead of loosening output checks',async()=>{
 await assert.rejects(translator(body=>completed('<b>'+body.choices[0].message.content+'</b>'))(input),/invalid-translation-text/)
 await assert.rejects(translator(()=>completed('Um jogo de fantasia com nome omitido.'))(input),/translation-name-mismatch/)
 const withEmptyTools=translator(body=>({...body,choices:[{...body.choices[0],message:{...body.choices[0].message,tool_calls:[]}}]}))
 assert.equal(await withEmptyTools(input),'Tibia é um jogo de fantasia.')
})


test('Qwen completion accepts only empty legacy placeholders or identical final text, never a conflicting answer',async()=>{
 for(const legacy of [null,undefined,'']){
  const actual=translator(body=>({...body,response:legacy}))
  assert.equal(await actual(input),'Tibia é um jogo de fantasia.')
 }
 assert.equal(await translator(body=>({...body,response:body.choices[0].message.content}))(input),'Tibia é um jogo de fantasia.')
 for(const legacy of ['Other answer',' ',42,{},[],false])await assert.rejects(translator(body=>({...body,response:legacy}))(input),/invalid-translation-response-shape-mixed/)
 for(const finish_reason of ['length','tool_calls'])await assert.rejects(translator(body=>({...body,response:null,choices:[{...body.choices[0],finish_reason}]}))(input),/invalid-translation-response-completion/)
 await assert.rejects(translator(body=>({...body,response:null,choices:[{...body.choices[0],message:{role:'assistant',content:'<b>invalid</b>'}}]}))(input),/invalid-translation-text/)
})
