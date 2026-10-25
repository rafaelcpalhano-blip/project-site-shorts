import {runBudgetProof} from '../helpers/outbound-budget-scenarios.ts'
import {createOutboundBudget} from '../../server/runtime/outbound-budget.ts'
export default {
 async fetch(request:Request):Promise<Response>{
  if(new URL(request.url).pathname!=='/__budget-proof')return new Response('Local fixture only',{status:404})
  try{
   let dispatched=0
   const scope=createOutboundBudget({maximum:4,cleanupReserve:0,fetcher:async()=>{dispatched++;await Promise.resolve();return new Response()}})
   const parallel=await Promise.allSettled(Array.from({length:10},()=>scope.fetch('https://fixture.example.test/')))
   if(dispatched!==4||parallel.filter(result=>result.status==='fulfilled').length!==4)throw Error('parallel-budget-failed')
   return Response.json({runtime:'workerd',scenarios:await runBudgetProof(),parallel:{requested:10,dispatched},deployReady:false,limits:['only explicitly injected fetch transports counted','no live OAuth or cloud quota measurement','DNS/sockets/bindings/CPU not certified','cover decision still open']})
  }catch(error){return Response.json({error:error instanceof Error?error.message:'proof-failed',deployReady:false},{status:500})}
 }
}
