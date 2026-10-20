import test from 'node:test'
import assert from 'node:assert/strict'
import { handleVideoPreview } from '../server/http/video-preview.ts'
import { createVideoPreviewClient } from '../src/features/submissions/services/video-preview-api.ts'
import { submitShort } from '../server/submissions/submit-short.ts'
import { SubmissionError } from '../server/submissions/submit-short.ts'
const origin = 'https://clipzone.example'
const video = 'https://clips.twitch.tv/TestClip'
const evidence = { existence:'confirmed', shortFormat:'confirmed', gameMatch:'confirmed', moderation:'unavailable', flags:[], title:'Título original' }
const request = (body = {url:video}, headers = {}) => new Request(origin+'/api/shorts/preview', {method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
const deps = {origin, resolveVisitor:async()=> 'a'.repeat(64), checkAbuse:async()=>{}, verify:async()=>evidence}
test('preview requires origin, session, JSON, bounded input and rate limit', async () => {
  assert.equal((await handleVideoPreview(request(),undefined)).status,503)
  assert.equal((await handleVideoPreview(request({}, {origin:'https://evil.example'}),deps)).status,403)
  assert.equal((await handleVideoPreview(request({}, {'content-type':'text/plain'}),deps)).status,415)
  assert.equal((await handleVideoPreview(request(),{...deps,resolveVisitor:async()=>null})).status,401)
  assert.equal((await handleVideoPreview(request({url:'x'.repeat(9000)}),deps)).status,413)
  assert.equal((await handleVideoPreview(request(),{...deps,checkAbuse:async()=>{throw new SubmissionError('abuse-limit')}})).status,429)
  for (const body of [{url:'https://evil.example'}, {url:video,gameId:'injected'}]) {
    assert.equal((await handleVideoPreview(request(body),{...deps,verify:async()=>assert.fail('no provider call')})).status,400)
  }
})
test('preview returns only validated title and hides provider errors', async () => {
  const result = await handleVideoPreview(request(),deps)
  assert.equal(result.headers.get('cache-control'),'no-store')
  assert.deepEqual(await result.json(),{title:'Título original'})
  for (const title of ['bad\u0000title','x'.repeat(501),'']) {
    assert.equal((await handleVideoPreview(request(),{...deps,verify:async()=>({...evidence,title})})).status,503)
  }
  assert.equal((await handleVideoPreview(request(),{...deps,verify:async()=>({...evidence,existence:'missing'})})).status,404)
  const failed = await handleVideoPreview(request(),{...deps,verify:async()=>{throw new Error('secret')}})
  assert.equal((await failed.text()).includes('secret'),false)
})
test('preview client establishes session, sends URL only and rejects invalid titles', async () => {
  const calls=[]
  const load=createVideoPreviewClient(async(path,options)=>{
    calls.push([path, options])
    return path==='/api/session'?new Response(null,{status:204}):Response.json({title:'Original'})
  })
  assert.equal(await load(video,new AbortController().signal),'Original')
  assert.deepEqual(JSON.parse(calls[1][1].body),{url:video})
  assert.equal(calls[1][1].credentials,'same-origin')
  let count=0
  await assert.rejects(createVideoPreviewClient(async()=>{count++;return new Response(null,{status:503})})(video,new AbortController().signal))
  assert.equal(count,1)
})
test('edited title is stored independently of fresh trusted original; forged original is rejected', async () => {
  for (const title of ['Meu título', undefined, '']) {
    const writes=new Map()
    const options={...deps,now:()=>new Date(),store:{transact:async work=>work({get:async path=>path==='games/game'?{status:'active'}:null,create:(path,data)=>writes.set(path,data),set:(path,data)=>writes.set(path,data)})}}
    const result=await submitShort({url:video,gameId:'game',title},'a'.repeat(64),options)
    assert.equal(writes.get('shorts/'+result.id).originalTitle,'Título original')
    assert.equal(writes.get('shorts/'+result.id).title,title || 'Título original')
    await assert.rejects(submitShort({url:video,gameId:'game',originalTitle:'forged'},'a'.repeat(64),options))
    await assert.rejects(submitShort({url:video,gameId:'game',title:'bad\u0000title'},'a'.repeat(64),options))
  }
})
