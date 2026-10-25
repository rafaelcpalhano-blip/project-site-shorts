import test from 'node:test'
import {databasePreparationCases} from './helpers/database-preparation-cases.ts'
for(const proof of databasePreparationCases)test(proof.name,proof.run)
