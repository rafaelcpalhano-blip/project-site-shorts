import test from 'node:test'
import assert from 'node:assert/strict'
import {createRestStore} from '../server/firestore/rest-store.ts'
const root='projects/clipzone-batch-test/databases/(default)/documents',paths=['games/a','games/b','shorts/c']
const found=(path,label)=>({found:{name:root+'/'+path,fields:{label:{stringValue:label}}}})
function setup(t,rows){let calls=0;t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(url,'https://firestore.googleapis.com/v1/'+root+':batchGet');assert.deepEqual(JSON.parse(options.body),{documents:paths.map(path=>root+'/'+path)});assert.equal(options.headers.Authorization,'Bearer fixture-only');return Response.json(rows)});return{store:createRestStore({projectId:'clipzone-batch-test',accessToken:async()=>'fixture-only'}),calls:()=>calls}}
test('unordered batch maps by full name, preserves missing and ignores metadata-only rows',async t=>{
 const d=setup(t,[{readTime:'2026-10-25T00:00:00Z'},found('shorts/c','C'),{missing:root+'/games/b'},found('games/a','A')])
 assert.deepEqual(await d.store.getMany(paths),[{label:'A'},null,{label:'C'}]);assert.equal(d.calls(),1)
})
for(const [label,rows]of [
 ['omitted result',[found('games/a','A'),found('games/b','B')]],
 ['duplicate',[found('games/a','A'),found('games/a','A'),found('shorts/c','C')]],
 ['foreign project',[{found:{name:root.replace('clipzone-batch-test','other-project')+'/games/a',fields:{}}},found('games/b','B'),found('shorts/c','C')]],
 ['unexpected path',[found('games/wrong','A'),found('games/b','B'),found('shorts/c','C')]],
 ['ambiguous found/missing',[{...found('games/a','A'),missing:root+'/games/a'},found('games/b','B'),found('shorts/c','C')]],
 ['malformed fields',[{found:{name:root+'/games/a',fields:[]}},found('games/b','B'),found('shorts/c','C')]],
 ['null row',[null,found('games/b','B'),found('shorts/c','C')]],
])test('batch fails closed for '+label,async t=>{const d=setup(t,rows);await assert.rejects(d.store.getMany(paths),/lote/);assert.equal(d.calls(),1)})
test('invalid batch size, duplicate and path rejected before token/fetch',async t=>{
 let tokens=0,calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;assert.fail('No fetch allowed')})
 const store=createRestStore({projectId:'clipzone-batch-test',accessToken:async()=>{tokens++;return 'fixture-only'}})
 for(const input of [[],Array(5).fill('games/a'),['games/a','games/a'],['../secret'],['games/a/extra']])await assert.rejects(store.getMany(input))
 assert.equal(tokens,0);assert.equal(calls,0)
})
