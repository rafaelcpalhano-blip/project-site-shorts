import {createWorkerEntry} from '../../server/runtime/worker-entry.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
import {workerEntryCases} from '../helpers/worker-entry-cases.ts'
import {runBudgetScenario} from '../helpers/outbound-budget-scenarios.ts'
const origin='https://clipzone.test',records=new Map<string,RecordData>();let tail=Promise.resolve()
const store:AtomicStore={get:async path=>structuredClone(records.get(path)??null),transact:work=>{const task=tail.then(async()=>{const writes=new Map<string,RecordData>();const result=await work({get:async path=>structuredClone(records.get(path)??null),set:(path,data)=>{writes.set(path,structuredClone(data))},create:(path,data)=>{if(records.has(path))throw Error('fixture-exists');writes.set(path,structuredClone(data))}});for(const [path,data]of writes)records.set(path,data);return result});tail=task.then(()=>{},()=>{});return task}}
interface Env {ASSETS:{fetch:(request:Request)=>Promise<Response>}}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url)
  if(url.pathname==='/__entry-proof'){
   const passed:string[]=[]
   try{for(const proof of workerEntryCases){await proof.run();passed.push(proof.name)}return Response.json({runtime:'workerd',passed,deployReady:false})}catch(error){return Response.json({passed,error:error instanceof Error?error.message:'proof-failed',deployReady:false},{status:500})}
  }
  if(url.pathname==='/__cpu-fixture')return Response.json({fixture:await runBudgetScenario(),deployReady:false})
  // TEST BRIDGE ONLY: fixed origin/IP, no remote edge attestation. Never deploy this file.
  const entry=createWorkerEntry({origin,assets:req=>env.ASSETS.fetch(req),trustedTransport:()=>({clientAddress:'203.0.113.10'}),createApi:async({origin})=>createPublicApi({origin,store,visitorSecret:'ab'.repeat(32),network:{secret:'cd'.repeat(32)},now:()=>new Date(),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('no-provider-in-fixture')}})})
  return entry(new Request(origin+url.pathname+url.search,request))
 }
}
