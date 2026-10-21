import test from 'node:test'
import assert from 'node:assert/strict'
import { createYouTubeVerifier } from '../server/videos/youtube.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const input = { url: 'https://www.youtube.com/shorts/abcdefghijk' }
const item = { id:'abcdefghijk', snippet:{title:'Jogada'}, contentDetails:{duration:'PT3M'},
  status:{privacyStatus:'public',uploadStatus:'processed',embeddable:true} }
function verify(result, fetcher) {
  return createYouTubeVerifier({apiKey:'test-only-key',fetcher:fetcher ?? (async()=>Response.json(result))})
}
test('YouTube uses fixed official endpoint and permits technical eligibility without claiming game or audiovisual verification', async()=>{
  let endpoint
  const evidence=await verify(null,async(url,options)=>{
    endpoint=url
    assert.equal(options.redirect,'error');assert.ok(options.signal)
    return Response.json({items:[item]})
  })(input)
  assert.equal(endpoint.origin+endpoint.pathname,'https://www.googleapis.com/youtube/v3/videos')
  assert.equal(endpoint.searchParams.get('id'),'abcdefghijk')
  assert.equal(endpoint.searchParams.get('key'),'test-only-key')
  assert.equal(endpoint.searchParams.get('part'),'snippet,status,contentDetails')
  assert.equal(evidence.existence,'confirmed');assert.equal(evidence.embedding,'allowed')
  assert.equal(evidence.shortFormat,'confirmed');assert.equal(evidence.gameMatch,'unknown')
  assert.equal(evidence.moderation,'unavailable');assert.equal(evidence.title,'Jogada')
  assert.equal(decidePublication(evidence).status,'published')
  assert.ok(!JSON.stringify(evidence).includes('test-only-key'))
})
test('YouTube missing, private, unprocessed, mismatched IDs and provider failures remain retryable',async()=>{
  for(const result of [null,{}, {items:[]},{items:[null]}, {items:[item,item]}, {items:[{...item,id:'other'}]},
    {items:[{...item,status:{...item.status,privacyStatus:'private'}}]},
    {items:[{...item,status:{...item.status,uploadStatus:'failed'}}]}]){
    const evidence=await verify(result)(input)
    assert.equal(evidence.existence,'unknown')
    assert.equal(decidePublication(evidence).status,'retry')
  }
  for(const status of [401,403,404,429,500]){
    assert.equal(decidePublication(await verify(null,async()=>new Response(null,{status}))(input)).status,'retry')
  }
  assert.equal(decidePublication(await verify(null,async()=>{throw new Error('timeout')})(input)).status,'retry')
  assert.equal((await verify({items:[{...item,status:{...item.status,privacyStatus:'unlisted'}}]})(input)).existence,'confirmed')
})
test('YouTube strictly accepts positive durations up to 180 seconds and rejects longer durations without rounding',async()=>{
  for(const duration of ['PT3M','PT180S','PT180.0S','PT59.5S','P0DT3M','PT0H3M0S']){
    assert.equal(decidePublication(await verify({items:[{...item,contentDetails:{duration}}]})(input)).status,'published',duration)
  }
  for(const duration of ['PT180.1S','PT181S','PT3M1S','PT1H','P1D','P1DT1H']){
    const evidence=await verify({items:[{...item,contentDetails:{duration}}]})(input)
    assert.equal(evidence.shortFormat,'invalid',duration)
    assert.equal(decidePublication(evidence).status,'rejected')
  }
  for(const duration of [undefined,null,180,'','PT','P','P0D','PT0S','PT-1S','PT1M60X','P1DT','NaN','PT1e3S']){
    assert.equal(decidePublication(await verify({items:[{...item,contentDetails:{duration}}]})(input)).status,'retry',String(duration))
  }
})
test('YouTube requires explicit embedding permission and ignores malformed titles',async()=>{
  for(const embeddable of [undefined,null,'true',1,false]){
    const evidence=await verify({items:[{...item,status:{...item.status,embeddable}}]})(input)
    assert.equal(decidePublication(evidence).status,embeddable===false?'rejected':'retry')
  }
  for(const title of ['', 'x'.repeat(501), 'invalid\u0000title']){
    const evidence=await verify({items:[{...item,snippet:{title}}]})(input)
    assert.equal(evidence.title,undefined)
    assert.equal(decidePublication(evidence).status,'published')
  }
})
test('YouTube rejects unsafe hosts, traditional URLs and other platforms before fetching',async()=>{
  let calls=0
  const check=verify(null,async()=>{calls++;return Response.json({items:[]})})
  for(const url of ['https://evil.example/shorts/abcdefghijk','https://youtube.com.evil.test/shorts/abcdefghijk',
    'https://youtube.com@evil.test/shorts/abcdefghijk','https://youtube.com/watch?v=abcdefghijk',
    'https://youtu.be/abcdefghijk','https://clips.twitch.tv/ExampleClip']){
    assert.equal((await check({url})).existence,'unknown')
  }
  assert.equal(calls,0)
  assert.throws(()=>createYouTubeVerifier({apiKey:' '}),/key required/)
})
