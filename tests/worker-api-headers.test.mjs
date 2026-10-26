import test, {before,after} from 'node:test'
import assert from 'node:assert/strict'
import {workerApiHeaderCases} from './helpers/worker-api-header-cases.ts'
const originalFetch=globalThis.fetch
before(()=>{globalThis.fetch=async()=>assert.fail('Real network forbidden in API header fixtures')})
after(()=>{globalThis.fetch=originalFetch})
for(const proof of workerApiHeaderCases)test(proof.name,proof.run)
