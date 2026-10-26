import test from 'node:test'
import {finalizationCases} from './helpers/worker-finalization-cases.ts'
for(const proof of finalizationCases)test(proof.name,proof.run)
