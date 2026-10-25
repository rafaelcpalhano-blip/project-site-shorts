import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createOutboundBudget} from '../../server/runtime/outbound-budget.ts'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createVisitorIdentity} from '../../server/security/visitor-identity.ts'
let env
const origin='https://clipzone.test',now=()=>new Date(),secret='ab'.repeat(32)
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Isolated emulator required')
 env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081}});await env.clearFirestore()
})
after(async()=>{await env?.cleanup()})
test('real rollback after guarded commit prevents limiter write; next independent scope succeeds',async()=>{
 const realFetch=globalThis.fetch
 function setup(maximum){
  const operations=[]
  const budget=createOutboundBudget({maximum,cleanupReserve:1,fetcher:async(url,init)=>{
   assert.ok(String(url).startsWith('http://127.0.0.1:8081/v1/projects/demo-clipzone-tests/'))
   operations.push(String(url).split(':').at(-1));return realFetch(url,init)
  }})
  const store=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081,fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
  return {budget,operations,api:createPublicApi({origin,store,now,visitorSecret:secret,maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('No provider allowed')}})}
 }
 const blocked=setup(3),api=await blocked.api
 const request=(path,cookie='')=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:'{}'})
 const session=await api(request('/api/session'));assert.equal(session.status,204)
 const cookie=session.headers.get('set-cookie').split(';')[0],response=await api(request('/api/games/list',cookie))
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'})
 assert.deepEqual(blocked.operations,['beginTransaction','batchGet','rollback']);assert.equal(blocked.budget.usage().dispatched,3)
 // Independent audit reads are outside the guarded invocation, on the test emulator only.
 const identity=await createVisitorIdentity(secret,now),visitor=await identity.resolveVisitor(request('/api/games/list',cookie))
 const audit=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081})
 assert.equal(await audit.get('publicReadAttempts/'+visitor),null)
 const fresh=setup(8),success=await (await fresh.api)(request('/api/games/list',cookie))
 assert.equal(success.status,200);assert.equal(fresh.budget.usage().dispatched,4)
 assert.equal((await audit.get('publicReadAttempts/'+visitor)).count,1)
})
