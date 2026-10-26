import test from 'node:test'
import {cpuProviderCases} from './helpers/worker-cpu-provider-cases.ts'
for(const proof of cpuProviderCases)test(proof.name,proof.run)
