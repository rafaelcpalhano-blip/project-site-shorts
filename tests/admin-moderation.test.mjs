import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicApi } from '../server/http/public-api.ts'
import { AdminAuthError } from '../server/auth/firebase-admin.ts'
import { parseReview, reviewShort } from '../server/moderation/review-short.ts'
import { cursor } from '../server/moderation/queue.ts'
const origin = 'https://clipzone.test', id = 'a'.repeat(64)
function memory() {
  const records = new Map()
  return { records, store: { transact: async work => {
    const changes = []
    const result = await work({ get: async path => structuredClone(records.get(path) ?? null),
      set: (path, data) => changes.push([path, data]), create: (path, data) => changes.push([path, data]) })
    for (const [path, data] of changes) records.set(path, data)
    return result
  } } }
}
const input = patch => ({ shortId: id, action: 'remove', reason: 'Violência real confirmada', revision: 0, reportCount: 0, ...patch })
test('review rejects forged fields, malformed IDs, actions, counters, reasons and cursors', () => {
  for (const patch of [{ actor:'forged' }, { shortId:'../private' }, { action:'forged' }, { action:'restore', targetStatus:'published' }, { revision:-1 },
    { reportCount:1.1 }, { reason:'x' }, { reason:'x'.repeat(501) }, { reason:'bad\nreason' }]) assert.throws(() => parseReview(input(patch)), /invalid-input/)
  for (const value of [{ time:'today', id }, { time:'2026-10-21T12:00:00.000Z', id:'../' }, { time:'2026-10-21T12:00:00.000Z', id, collection:'private' }]) assert.throws(() => cursor(value), /invalid-input/)
})
test('removal and archive preserve reservation and quota; duplicate decisions fail without extra audit', async () => {
  const { records, store } = memory(), now = () => new Date('2026-10-21T12:00:00Z')
  records.set('shorts/'+id, { moderationStatus:'published', title:'Clip' })
  records.set('videoIdentities/'+id, { shortId:id })
  records.set('submissionLimits/existing', { count:5 })
  const deps = { store, now, verify:async()=>{throw new Error('must not run')} }
  assert.equal((await reviewShort(parseReview(input()),'owner',deps)).status,'removed')
  await assert.rejects(reviewShort(parseReview(input()),'owner',deps), /stale-review/)
  assert.equal(records.get('videoIdentities/'+id).shortId,id)
  assert.equal(records.get('submissionLimits/existing').count,5)
  const logs = [...records].filter(([path])=>path.startsWith('moderationLogs/'))
  assert.equal(logs.length,1)
  assert.equal(logs[0][1].actor,'owner')
  assert.equal(logs[0][1].reason,'Violência real confirmada')
})
test('no authorization, invalid origin, forged body and failed service cannot read or mutate private data', async () => {
  let calls=0, reads=0
  const { store }=memory()
  store.query=async()=>{reads++;return []}
  const config={apiKey:'public',appId:'app',authDomain:'test',projectId:'test'}
  const settings={origin,visitorSecret:'a'.repeat(64),store,now:()=>new Date(),maximumAttempts:50,attemptWindowMs:60000,
    verify:async()=>{throw new Error('unused')},allowSessionIssuance:async()=>true}
  const req=(path,body={},headers={},method='POST')=>new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},
    ...(method==='POST'?{body:JSON.stringify(body)}:{})})
  const closed=await createPublicApi(settings)
  assert.equal((await closed(req('/api/admin/queue',{queue:'reports'}))).status,503)
  const api=await createPublicApi({...settings,admin:{publicConfig:config,authorize:async request=>{
    calls++
    if(request.headers.get('authorization')!=='Bearer valid')throw new AdminAuthError('admin-forbidden',403)
    return {uid:'owner',email:'test@example.test'}
  }}})
  const cookie=(await api(req('/api/session'))).headers.get('set-cookie').split(';')[0]
  for(const path of ['/api/admin/queue','/api/admin/detail','/api/admin/review']){
    assert.equal((await api(req(path,{}, {cookie}))).status,403)
    assert.equal((await api(req(path,{}, {cookie,Authorization:'Bearer valid',Origin:'https://evil.test'}))).status,403)
    assert.equal((await api(req(path,{}, {cookie,Authorization:'Bearer valid'},'GET'))).status,405)
  }
  assert.equal(reads,0)
  const headers={cookie,Authorization:'Bearer valid'}
  assert.equal((await api(req('/api/admin/queue',{queue:'reports',collection:'submissionOwners'},headers))).status,400)
  const result=await api(req('/api/admin/queue',{queue:'reports'},headers))
  assert.equal(result.status,200)
  assert.equal(result.headers.get('cache-control'),'no-store')
  assert.deepEqual(await result.json(),{items:[],next:null})
  assert.equal(reads,1)
  const huge=new Request(origin+'/api/admin/review',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:'x'.repeat(8200)})
  assert.equal((await api(huge)).status,413)
  store.query=async()=>{throw new Error('private details must never leak')}
  const failed=await api(req('/api/admin/queue',{queue:'reports'},headers))
  assert.equal(failed.status,503)
  assert.deepEqual(await failed.json(),{error:'unavailable'})
  assert.ok(calls>0)
})
