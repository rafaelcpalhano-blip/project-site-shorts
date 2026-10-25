import {createWorkerFetch} from '../../server/runtime/worker-fetch.ts'
import {freeIngressCases} from '../helpers/worker-free-cases.ts'
import {prepareWorkload,workloadNames} from '../helpers/worker-critical-workloads.ts'
import type {AuthFixture,WorkloadName} from '../helpers/worker-critical-workloads.ts'
let invocations=0
let queue:Array<Awaited<ReturnType<typeof prepareWorkload>>>=[]
export default {async fetch(request:Request,env:{ASSETS:{fetch:(request:Request)=>Promise<Response>}}){
 invocations++;const path=new URL(request.url).pathname
 try{
  if(path==='/__route-count')return Response.json({invocations})
  if(path==='/__free-proof'){const passed=[];for(const proof of freeIngressCases){await proof.run();passed.push(proof.name)}let redirectErrorConstructorSupported=false;try{new Request('https://fixture.invalid',{redirect:'error'});redirectErrorConstructorSupported=true}catch{/* record installed behavior */}return Response.json({passed,redirectErrorConstructorSupported,edgeAttested:false})}
  if(path==='/__fetch-proof'){let refused=false;try{await createWorkerFetch()('http://127.0.0.1:8797/redirect',{redirect:'error',headers:{Authorization:'Bearer fixture-only'}})}catch(error){refused=error instanceof Error&&error.message==='redirect-not-permitted'}return Response.json({refused})}
  if(path==='/__prepare'){const input=await request.json() as {name:WorkloadName;fixture:AuthFixture};if(!workloadNames.includes(input.name))return new Response(null,{status:400});queue=[];for(let i=0;i<10;i++)queue.push(await prepareWorkload(input.name,input.fixture));return Response.json({ready:queue.length})}
  if(path==='/__run'){const run=queue.shift();if(!run)return new Response(null,{status:409});return Response.json(await run())}
  if(path==='/api'||path.startsWith('/api/'))return Response.json({error:'not-found'},{status:404,headers:{'X-Fixture-Worker':'yes'}})
  return env.ASSETS.fetch(request)
 }catch(error){return Response.json({error:error instanceof Error?error.message:'fixture-failed'},{status:500})}
}}
