import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfiguredVideoVerifier } from '../server/videos/configured.ts'
import { handleSubmission } from '../server/http/submissions.ts'
import { reviewShort } from '../server/moderation/review-short.ts'
import { decidePublication, hasTechnicalEligibility } from '../server/submissions/decision.ts'
const origin='https://clipzone.test'
const input={url:'https://www.tiktok.com/@gamer/video/123456789',gameId:'game',title:'Meu título'}
const metadata={version:'1.0',type:'video',provider_name:'TikTok',provider_url:'https://www.tiktok.com',title:'Original TikTok'}
const request=(body=input)=>new Request(origin+'/api/shorts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
function scenario() {
 const records=new Map([['games/game',{status:'active',officialName:'Jogo selecionado'}]])
 let provider=()=>Response.json(metadata),calls=0
 const verify=createConfiguredVideoVerifier({fetcher:async()=>{calls++;return provider()}})
 const store={transact:async work=>{
  const writes=new Map()
  const result=await work({get:async path=>records.get(path)??null,
   create:(path,value)=>{assert.ok(!records.has(path)&&!writes.has(path));writes.set(path,value)},
   set:(path,value)=>writes.set(path,value)})
  for(const [path,value] of writes)records.set(path,value)
  return result
 }}
 const options={verify,store,now:()=>new Date('2026-10-21T12:00:00Z')}
 const dependencies={...options,origin,resolveVisitor:async()=> 'a'.repeat(64),checkAbuse:async()=>{}}
 return {records,options,dependencies,setProvider:value=>{provider=value},calls:()=>calls}
}
const quota=records=>records.get('submissionLimits/'+'a'.repeat(64)+'-2026-10-21')?.count??0
const review=(id,action,revision=0)=>({shortId:id,action,revision,reportCount:0,reason:'Decisão administrativa de teste'})

test('verified TikTok publishes without duration or external game proof and audits the explicit exception',async()=>{
 const {records,dependencies}=scenario()
 const evidence=await dependencies.verify(input)
 assert.equal(evidence.shortFormat,'unknown')
 assert.equal(evidence.gameMatch,'unknown')
 const response=await handleSubmission(request(),dependencies)
 assert.equal(response.status,201)
 const result=await response.json()
 assert.equal(result.status,'published')
 const saved=records.get('shorts/'+result.id)
 assert.equal(saved.title,'Meu título');assert.equal(saved.originalTitle,'Original TikTok')
 assert.equal(saved.gameId,'game');assert.equal(quota(records),1)
 assert.equal(records.get('videoIdentities/'+result.id).shortId,result.id)
 const logs=[...records.entries()].filter(([path])=>path.startsWith('moderationLogs/'))
 assert.equal(logs[0][1].reasonCode,'tiktok-platform-policy')
 const duplicate=await handleSubmission(request({...input,url:input.url+'?tracking=other'}),dependencies)
 assert.equal(duplicate.status,409)
 assert.equal(quota(records),1)
})
test('TikTok platform exception cannot authorize YouTube, unknown sources or contradictory technical evidence',()=>{
 const evidence={existence:'confirmed',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[],formatPolicy:'tiktok-platform-exception'}
 assert.equal(decidePublication(evidence,'TikTok').status,'published')
 for(const platform of [undefined,'YouTube','Twitch','https://www.tiktok.com']){
  assert.equal(decidePublication(evidence,platform).status,'retry')
  assert.equal(hasTechnicalEligibility(evidence,platform),false)
 }
 for(const patch of [{existence:'unknown'},{embedding:'unknown'}]){
  assert.equal(decidePublication({...evidence,...patch},'TikTok').status,'retry')
 }
 for(const patch of [{existence:'missing'},{shortFormat:'invalid'},{embedding:'blocked'}]){
  assert.equal(decidePublication({...evidence,...patch},'TikTok').status,'rejected')
 }
 assert.equal(decidePublication({...evidence,formatPolicy:undefined},'TikTok').status,'retry')
})
test('TikTok metadata failures, identity mismatches and unsafe URLs cannot publish or reserve quota',async()=>{
 const {records,dependencies,setProvider}=scenario()
 for(const data of [null,{}, {...metadata,type:'rich'},{...metadata,version:'2.0'},
  {...metadata,provider_name:'Other'},{...metadata,provider_url:'https://evil.test'},
  {...metadata,embed_product_id:'different'},{...metadata,embed_product_id:123456789}]){
  setProvider(()=>Response.json(data))
  assert.equal((await handleSubmission(request(),dependencies)).status,503)
  assert.equal(records.size,1)
 }
 for(const status of [403,404,429,500]){
  setProvider(()=>new Response(null,{status}))
  assert.equal((await handleSubmission(request(),dependencies)).status,503)
  assert.equal(records.size,1)
 }
 setProvider(()=>{throw new Error('private provider error')})
 assert.equal((await handleSubmission(request(),dependencies)).status,503)
 assert.equal(records.size,1)
 for(const url of ['https://tiktok.com.evil.test/@gamer/video/123456789',
  'https://tiktok.com@evil.test/@gamer/video/123456789','https://vm.tiktok.com/example',
  'https://www.tiktok.com/@gamer/photo/123456789']){
  assert.equal((await handleSubmission(request({...input,url}),dependencies)).status,400)
 }
})
test('TikTok validates an optional source ID and publishes with manual or fallback title when source omits it',async()=>{
 const {records,dependencies,setProvider}=scenario()
 setProvider(()=>Response.json({...metadata,embed_product_id:'123456789',title:undefined}))
 const response=await handleSubmission(request({...input,title:''}),dependencies)
 assert.equal(response.status,201)
 const result=await response.json(),saved=records.get('shorts/'+result.id)
 assert.equal(saved.originalTitle,null)
 assert.equal(saved.title,'Short de Jogo selecionado')
 assert.equal(quota(records),1)
})
test('clients cannot submit a format exception or forged duration and inactive games remain blocked',async()=>{
 const {records,dependencies,calls}=scenario()
 for(const extra of [{formatPolicy:'tiktok-platform-exception'},{duration:30},{shortFormat:'confirmed'}]){
  assert.equal((await handleSubmission(request({...input,...extra}),dependencies)).status,400)
 }
 assert.equal(calls(),0)
 records.set('games/game',{status:'inactive'})
 assert.equal((await handleSubmission(request(),dependencies)).status,422)
 assert.equal(records.size,1)
})
test('flagged TikTok stays pending without quota; authorized review uses the same exception',async()=>{
 const {records,options,dependencies}=scenario()
 const flagged={...dependencies,verify:async submission=>({...await dependencies.verify(submission),flags:['threat']})}
 const response=await handleSubmission(request(),flagged)
 assert.equal(response.status,202)
 const result=await response.json()
 assert.equal(result.status,'pending');assert.equal(quota(records),0)
 await reviewShort(review(result.id,'approve'),'test-admin',options)
 assert.equal(records.get('shorts/'+result.id).moderationStatus,'published')
 assert.equal(quota(records),1)
})
test('TikTok removal and restoration preserve original identity and do not charge twice',async()=>{
 const {records,options,dependencies}=scenario()
 const result=await (await handleSubmission(request(),dependencies)).json()
 await reviewShort(review(result.id,'remove'),'test-admin',options)
 assert.equal((await handleSubmission(request(),dependencies)).status,409)
 await reviewShort(review(result.id,'restore',1),'test-admin',options)
 assert.equal(records.get('shorts/'+result.id).moderationStatus,'published')
 assert.equal(records.get('videoIdentities/'+result.id).shortId,result.id)
 assert.equal(quota(records),1)
})
test('TikTok exception still enforces the five published videos per day',async()=>{
 const {records,dependencies}=scenario()
 for(let index=0;index<6;index++){
  const response=await handleSubmission(request({...input,url:'https://www.tiktok.com/@gamer/video/12345'+index}),dependencies)
  assert.equal(response.status,index<5?201:429)
 }
 assert.equal(quota(records),5)
 assert.equal([...records.keys()].filter(path=>path.startsWith('shorts/')).length,5)
})
