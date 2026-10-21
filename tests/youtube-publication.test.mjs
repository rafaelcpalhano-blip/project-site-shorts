import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfiguredVideoVerifier } from '../server/videos/configured.ts'
import { handleSubmission } from '../server/http/submissions.ts'
import { parseVideoUrl } from '../src/lib/validation/video-url.ts'
const origin='https://clipzone.test'
const input={url:'https://www.youtube.com/shorts/abcdefghijk?si=tracking',gameId:'game',title:'Meu título'}
const item={id:'abcdefghijk',snippet:{title:'Original atualizado'},contentDetails:{duration:'PT180S'},
  status:{privacyStatus:'public',uploadStatus:'processed',embeddable:true}}
const request=(value=input)=>new Request(origin+'/api/shorts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)})
function scenario() {
  const records=new Map([['games/game',{status:'active'}]])
  let provider=()=>Response.json({items:[item]})
  const verify=createConfiguredVideoVerifier({youtubeApiKey:'test-only-key',fetcher:async()=>provider()})
  const dependencies={origin,verify,resolveVisitor:async()=> 'a'.repeat(64),checkAbuse:async()=>{},now:()=>new Date('2026-10-21T12:00:00Z'),
    store:{transact:async work=>{
      const writes=new Map()
      const result=await work({get:async path=>records.get(path)??null,create:(path,value)=>writes.set(path,value),set:(path,value)=>writes.set(path,value)})
      for(const [path,value] of writes)records.set(path,value)
      return result
    }}}
  return {records,dependencies,setProvider:value=>{provider=value}}
}
test('real configured YouTube pipeline retries without reserving, then publishes, preserves titles and blocks canonical duplicates',async()=>{
  const {records,dependencies,setProvider}=scenario()
  for(const status of [403,429,500]){
    setProvider(()=>new Response(null,{status}))
    const response=await handleSubmission(request(),dependencies)
    assert.equal(response.status,503)
    assert.equal((await response.json()).error,'verification-incomplete')
    assert.equal(records.size,1)
  }
  setProvider(()=>Response.json({items:[item]}))
  const response=await handleSubmission(request(),dependencies)
  assert.equal(response.status,201)
  const result=await response.json()
  assert.equal(result.status,'published');assert.equal(result.remaining,4)
  const saved=records.get('shorts/'+result.id)
  assert.equal(saved.title,'Meu título');assert.equal(saved.originalTitle,'Original atualizado')
  assert.equal(saved.normalizedUrl,'https://www.youtube.com/shorts/abcdefghijk')
  assert.equal(saved.gameId,'game')
  const duplicate=await handleSubmission(request({...input,url:'https://m.youtube.com/shorts/abcdefghijk/?si=different'}),dependencies)
  assert.equal(duplicate.status,409)
  assert.equal((await duplicate.json()).publicShortId,result.id)
  assert.equal(records.get('submissionLimits/'+'a'.repeat(64)+'-2026-10-21').count,1)
})
test('configured YouTube rejects excessive duration and disabled embedding without writes or permanent blocking',async()=>{
  const {records,dependencies,setProvider}=scenario()
  for(const patch of [{contentDetails:{duration:'PT180.1S'}},{status:{...item.status,embeddable:false}}]){
    setProvider(()=>Response.json({items:[{...item,...patch}]}))
    assert.equal((await handleSubmission(request(),dependencies)).status,422)
    assert.equal(records.size,1)
  }
  setProvider(()=>Response.json({items:[{...item,contentDetails:{}}]}))
  assert.equal((await handleSubmission(request(),dependencies)).status,503)
  assert.equal(records.size,1)
  setProvider(()=>Response.json({items:[item]}))
  assert.equal((await handleSubmission(request(),dependencies)).status,201)
})
test('Shorts parser validates exact domain and canonical ID while guiding traditional and shortened URLs',()=>{
  for(const host of ['youtube.com','www.youtube.com','m.youtube.com']){
    assert.deepEqual(parseVideoUrl('https://'+host+'/shorts/abcdefghijk/?si=tracking#x'),
      {identity:'YouTube:abcdefghijk',platform:'YouTube',url:'https://www.youtube.com/shorts/abcdefghijk'})
  }
  for(const url of ['https://www.youtube.com/watch?v=abcdefghijk','https://youtu.be/abcdefghijk']){
    assert.throws(()=>parseVideoUrl(url),/Compartilhar/)
  }
  for(const url of ['https://www.youtube.com.evil.test/shorts/abcdefghijk','https://youtube.com@evil.test/shorts/abcdefghijk',
    'https://youtube.com:8443/shorts/abcdefghijk','http://youtube.com/shorts/abcdefghijk','https://youtube.com/shorts/abc',
    'https://youtube.com/path/shorts/abcdefghijk','https://evil.test/?next=https://youtube.com/shorts/abcdefghijk']){
    assert.throws(()=>parseVideoUrl(url))
  }
})
