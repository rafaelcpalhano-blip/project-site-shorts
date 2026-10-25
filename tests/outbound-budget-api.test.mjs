import test from 'node:test'
import assert from 'node:assert/strict'
import {runBudgetProof} from './helpers/outbound-budget-scenarios.ts'
test('real API/REST composition counts credential, retries and cleanup with safe HTTP failure',async()=>{
 const results=await runBudgetProof();assert.equal(results.length,6)
 console.log(JSON.stringify(results.map(({name,status,usage,commits,committedQuota})=>({name,status,usage,commits,committedQuota}))))
})
