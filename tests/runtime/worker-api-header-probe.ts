import {workerApiHeaderCases} from '../helpers/worker-api-header-cases.ts'
import {workerEntryCases} from '../helpers/worker-entry-cases.ts'
export default {
 async fetch(){
  const passed:string[]=[]
  try{for(const proof of [...workerEntryCases,...workerApiHeaderCases]){await proof.run();passed.push(proof.name)}return Response.json({passed,fixturesOnly:true})}
  catch{return Response.json({passed,error:'local-header-proof-failed'},{status:500})}
 },
}
