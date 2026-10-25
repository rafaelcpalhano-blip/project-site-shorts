import {databasePreparationCases} from '../helpers/database-preparation-cases.ts'
export default {async fetch(request:Request){
 if(new URL(request.url).pathname!=='/__database-proof')return new Response(null,{status:404})
 const passed=[]
 try{for(const proof of databasePreparationCases){await proof.run();passed.push(proof.name)}return Response.json({passed,remoteCalls:0,realCredentials:false,remoteReady:false})}catch(error){return Response.json({passed,error:error instanceof Error?error.message:'proof-failed'},{status:500})}
}}
