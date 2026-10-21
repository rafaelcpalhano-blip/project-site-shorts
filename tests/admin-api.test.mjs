import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicApi } from '../server/http/public-api.ts'
const origin='https://clipzone.test'
function options(patch={}){
 const records=new Map()
 return {origin,visitorSecret:'a'.repeat(64),now:()=>new Date('2026-10-20T12:00:00Z'),maximumAttempts:1,attemptWindowMs:60000,
  allowSessionIssuance:async()=>true,verify:async()=>{throw new Error('not needed')},
  store:{transact:async work=>work({get:async path=>records.get(path)||null,set:(path,value)=>records.set(path,value),create:(path,value)=>records.set(path,value)})},...patch}
}
const request=(path,headers={},method='POST')=>new Request(origin+path,{method,headers:{Origin:origin,...headers}})
test('admin routes fail closed without configuration; public config never includes permission list',async()=>{
 const closed=await createPublicApi(options())
 assert.equal((await closed(request('/api/admin/config',{},'GET'))).status,503)
 assert.equal((await closed(request('/api/admin/session'))).status,503)
 const publicConfig={apiKey:'public-key',projectId:'clipzone-test',authDomain:'clipzone-test.firebaseapp.com',appId:'app'}
 const api=await createPublicApi(options({admin:{publicConfig,authorize:async()=>{throw new Error('must not run')}}}))
 assert.deepEqual(await (await api(request('/api/admin/config',{},'GET'))).json(),publicConfig)
 assert.equal((await api(request('/api/admin/session'))).status,429)
})
test('admin authorization requires visitor admission and has a separate effective attempt limit',async()=>{
 let verified=0
 const api=await createPublicApi(options({admin:{publicConfig:{apiKey:'public-key',projectId:'clipzone-test',authDomain:'clipzone-test.firebaseapp.com',appId:'app'},authorize:async()=>{verified++;return {uid:'owner',email:'owner@example.test'}}}}))
 const issued=await api(request('/api/session'))
 const cookie=issued.headers.get('set-cookie').split(';')[0]
 const headers={cookie,Authorization:'Bearer controlled-test-token'}
 assert.equal((await api(request('/api/admin/session',headers))).status,200)
 assert.equal((await api(request('/api/admin/session',headers))).status,429)
 assert.equal(verified,1)
 assert.equal((await api(request('/api/admin/session',{...headers,Origin:'https://evil.test'}))).status,403)
})
