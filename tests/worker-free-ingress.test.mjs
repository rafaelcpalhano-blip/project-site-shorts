import test from 'node:test'
import {freeIngressCases} from './helpers/worker-free-cases.ts'
for(const proof of freeIngressCases)test(proof.name,proof.run)
