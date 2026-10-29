import test from 'node:test'
import assert from 'node:assert/strict'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createPublicApi} from '../server/http/public-api.ts'

// Characterization of the existing REST composition, not a Workers compatibility certificate.
// Every fetch is intercepted; these fixtures never access Google, emulators or user records.
const origin='https://clipzone.test',project='clipzone-runtime-test',root=`projects/${project}/databases/(default)/documents`
const now=new Date('2026-10-25T07:00:00Z')
function value(item){
 if(item instanceof Date)return {timestampValue:item.toISOString()}
 if(typeof item==='string')return {stringValue:item}
 if(typeof item==='number')return {integerValue:String(item)}
 if(typeof item==='boolean')return {booleanValue:item}
 throw Error('Unsupported fixture value')
}
const document=(path,data)=>({name:root+'/'+path,fields:Object.fromEntries(Object.entries(data).map(([key,item])=>[key,value(item)]))})
const request=(path,cookie='',body={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
async function fixture(t,{hidden=false,shared=false,ceiling=Infinity,batch=true}={}){
 const docs=new Map(),rows=[],calls=[]
 const generationId='a'.repeat(32),epoch='b'.repeat(32)
 docs.set('rankingState/current',document('rankingState/current',{version:1,generationId,computedAt:new Date(now.getTime()-1000),metricsEpoch:epoch}))
 docs.set('rankingState/metrics',document('rankingState/metrics',{version:1,ready:true,epoch}))
 for(let i=0;i<30;i++){
  const id='s'+String(i).padStart(2,'0'),gameId=shared?'g0':'g'+i
  const data={gameId,moderationStatus:'published',createdAt:new Date(now.getTime()-1000-i*1000),title:'Clip '+i,platform:'Twitch',platformVideoId:'BudgetClip'+i,normalizedUrl:'https://clips.twitch.tv/BudgetClip'+i,channelName:'Canal',likeCount:0}
  docs.set('shorts/'+id,document('shorts/'+id,data))
  docs.set('games/'+gameId,document('games/'+gameId,{status:(typeof hidden==='function'?hidden(i):hidden)?'hidden':'active',officialName:'Jogo '+i,source:'manual'}))
  rows.push({id,document:document('shorts/'+id,data)})
 }
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  const target=new URL(url)
  assert.equal(target.origin,'https://firestore.googleapis.com')
  assert.equal(target.pathname.split(':')[0],'/v1/'+root)
  assert.equal(options.headers.Authorization,'Bearer fixture-only')
  const operation=target.pathname.split(':').at(-1),body=JSON.parse(options.body)
  calls.push({operation,body})
  if(calls.length>ceiling)throw Error('fixture-subrequest-ceiling')
  if(operation==='beginTransaction')return Response.json({transaction:'fixture-transaction'})
  if(operation==='commit'||operation==='rollback')return Response.json({})
  if(operation==='batchGet')return Response.json(body.documents.map(name=>{
   const found=docs.get(name.slice(root.length+1));return found?{found}:{missing:name}
  }).reverse())
  assert.equal(operation,'runQuery')
  const collection=body.structuredQuery.from[0].collectionId
  assert.ok(['shorts','rankingItems'].includes(collection))
  const candidates=collection==='shorts'?rows:rows.map((row,index)=>({id:'rank-'+row.id,document:document('rankingItems/rank-'+row.id,{shortId:row.id,createdAt:new Date(now.getTime()-1000-index*1000),score:0,generationId})}))
  const after=body.structuredQuery.startAt?.values.at(-1).referenceValue.split('/').at(-1)
  const start=after?candidates.findIndex(row=>row.id===after)+1:0
  return Response.json(candidates.slice(start,start+body.structuredQuery.limit).map(row=>({document:row.document,readTime:now.toISOString()})))
 })
 const store=createRestStore({projectId:project,accessToken:async()=>'fixture-only'})
 if(!batch)delete store.getMany
 const api=await createPublicApi({origin,store,now:()=>now,visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('Provider must not be contacted')}})
 const session=await api(request('/api/session'))
 assert.equal(session.status,204)
 const cookie=session.headers.get('set-cookie').split(';')[0]
 assert.match(session.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/)
 assert.equal(calls.length,0,'Session without network protection has no Firestore calls in this fixture')
 return {calls,api,cookie}
}
for(const shared of [true,false])test(`REST feed: 15 visible cards, ${shared?'one shared game':'15 distinct games'}, signed session and limiter retained`,async t=>{
 const f=await fixture(t,{shared})
 const response=await f.api(request('/api/feed/ordered',f.cookie,{order:'latest'})),body=await response.json()
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.equal(body.items.length,15);assert.equal(body.items[0].id,'s00');assert.equal(body.items.at(-1).id,'s14')
 assert.ok(body.next);assert.equal(body.candidatesExamined,15)
 assert.equal(f.calls.filter(call=>call.operation==='beginTransaction').length,1)
 assert.equal(f.calls.filter(call=>call.operation==='commit').length,1)
 const gameReads=f.calls.filter(call=>call.operation==='batchGet'&&call.body.documents[0].includes('/games/'))
 assert.equal(gameReads.length,shared?1:4)
 assert.equal(f.calls.length,shared?9:12)
 t.diagnostic(`Observed REST calls: ${f.calls.length}; excludes OAuth renewal, retries and runtime accounting.`)
})
test('baseline without batch: 30 hidden distinct games require 65 calls and preserve a continuation instead of claiming the end',async t=>{
 const f=await fixture(t,{hidden:true,batch:false})
 const response=await f.api(request('/api/feed/ordered',f.cookie,{order:'latest'})),body=await response.json()
 assert.equal(response.status,200);assert.deepEqual(body.items,[]);assert.equal(body.limited,true)
 assert.equal(body.candidatesExamined,30);assert.ok(body.next)
 assert.equal(f.calls.filter(call=>call.operation==='runQuery').length,2)
 assert.equal(f.calls.length,65);assert.ok(f.calls.length>50,'Known deployment blocker: unbatched baseline exceeds the Free budget')
 t.diagnostic('65 observed REST calls: 2 queries + 30 short reads + 30 game reads + 3 limiter calls. Historical unbatched baseline, retained for comparison.')
})
test('simulated transport ceiling returns a private-safe 503, without a misleading successful partial feed',async t=>{
 const f=await fixture(t,{hidden:true,ceiling:8})
 const response=await f.api(request('/api/feed/ordered',f.cookie,{order:'latest'}))
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.deepEqual(await response.json(),{error:'unavailable'})
 assert.ok(f.calls.length>8)
})

for(const [label,hidden,expected,visible]of [['all hidden',true,21,0],['14 visible then hidden',i=>i>=14,43,14]])test(`bounded batch feed: ${label} remains below 50 without changing continuation`,async t=>{
 const f=await fixture(t,{hidden,ceiling:50})
 const response=await f.api(request('/api/feed/ordered',f.cookie,{order:'latest'})),body=await response.json()
 assert.equal(response.status,200);assert.equal(body.items.length,visible);assert.equal(body.candidatesExamined,30)
 assert.equal(body.limited,true);assert.ok(body.next)
 assert.equal(f.calls.length,expected)
 assert.ok(f.calls.filter(call=>call.operation==='batchGet').every(call=>call.body.documents.length<=4))
 t.diagnostic(`${expected} REST calls; OAuth/retries/CPU remain separate deployment gates.`)
})

for(const order of ['latest','likes'])test(order+': candidate/visibility mixes keep the bounded no-retry budget',async t=>{
 let maximum=0
 for(let visible=0;visible<=15;visible++){
  const f=await fixture(t,{hidden:i=>i>=visible,ceiling:50})
  const response=await f.api(request('/api/feed/ordered',f.cookie,{order})),body=await response.json()
  assert.equal(response.status,200);assert.equal(body.items.length,visible)
  assert.ok(f.calls.length<=45);maximum=Math.max(maximum,f.calls.length)
  if(visible<15){assert.equal(body.candidatesExamined,30);assert.ok(body.next)}
 }
 assert.equal(maximum,43)
 t.diagnostic(`Maximum across 16 mixes: ${maximum} calls, excluding retry/OAuth.`)
})

