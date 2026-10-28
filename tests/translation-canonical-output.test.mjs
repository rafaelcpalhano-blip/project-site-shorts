import test from 'node:test'
import assert from 'node:assert/strict'
import {createDescriptionTranslator} from '../server/games/translate-description.ts'
const input={officialName:'Doom',aliases:[],description:'Doom is a game.'}
function translator(change=body=>body){return createDescriptionTranslator({accountId:'a'.repeat(32),token:'fixture-only'},async(_url,init)=>{
 const content=JSON.parse(JSON.parse(init.body).messages[1].content).description.replace('is a game.','é um jogo.')
 const body={object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content,reasoning_content:'Never persist reasoning'}}]}
 return Response.json({success:true,result:change(body)})
})}

test('documented final completion is authoritative; legacy content is never returned or concatenated',async()=>{
 for(const response of ['Different auxiliary text','<script>private auxiliary text</script>',null,'',42,{},false])assert.equal(await translator(body=>({...body,response}))(input),'Doom é um jogo.')
})

test('legacy-only compatibility remains available when choices is absent',async()=>{
 assert.equal(await translator(body=>({response:body.choices[0].message.content}))(input),'Doom é um jogo.')
})

test('invalid completion never falls back to an apparently valid legacy response',async()=>{
 const variants=[body=>({...body,choices:[]}),body=>({...body,choices:[...body.choices,...body.choices]}),body=>({...body,object:'unsupported'}),body=>({...body,choices:null}),body=>({...body,choices:[{...body.choices[0],finish_reason:'length'}]}),body=>({...body,choices:[{...body.choices[0],message:{role:'assistant',content:null}}]})]
 for(const change of variants)await assert.rejects(translator(body=>({...change(body),response:body.choices[0].message.content}))(input),/invalid-translation-response/)
})

test('tools, refusal and invalid role are rejected despite valid legacy text',async()=>{
 for(const patch of [{tool_calls:[{}]},{refusal:'Refused'},{role:'user'}])await assert.rejects(translator(body=>({...body,response:body.choices[0].message.content,choices:[{...body.choices[0],message:{...body.choices[0].message,...patch}}]}))(input),/invalid-translation-response-completion/)
})

test('unsafe final text and lost names still fail even if legacy text looks valid',async()=>{
 for(const content of ['<b>Unsafe final text</b>','A game without its protected title.'])await assert.rejects(translator(body=>({...body,response:body.choices[0].message.content,choices:[{...body.choices[0],message:{role:'assistant',content}}]}))(input),/invalid-translation-text|translation-name-mismatch/)
})
