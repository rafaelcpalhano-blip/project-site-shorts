import test from 'node:test'
import {workerEntryCases} from './helpers/worker-entry-cases.ts'
for(const proof of workerEntryCases)test(proof.name,proof.run)
