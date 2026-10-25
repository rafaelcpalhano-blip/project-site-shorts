import {isIP} from 'node:net'
import {serveStaticGameCover} from './static-game-cover.ts'
import {createOutboundBudget} from './outbound-budget.ts'
type Budget=ReturnType<typeof createOutboundBudget>
export interface WorkerTransport {clientAddress:string}
type Handler=(request:Request,trusted?:WorkerTransport)=>Promise<Response>
interface Options {
 origin:string
 assets:(request:Request)=>Promise<Response>
 // Server-supplied resolver, not a browser assertion or arbitrary forwarded header.
 trustedTransport:(request:Request)=>WorkerTransport|undefined
 createApi:(scope:{origin:string;budget:Budget})=>Promise<Handler>
 maximumCalls?:number
 fetcher?:typeof fetch
}
const reply=(status:number,error:string)=>Response.json({error},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
/** Composable entry, not an activated deployment. No default CF/header trust policy. */
export function createWorkerEntry(options:Options){
 const canonical=new URL(options.origin)
 if(canonical.protocol!=='https:'||canonical.origin!==options.origin)throw Error('invalid-worker-origin')
 // Validate configuration before accepting traffic; each invocation gets a fresh instance below.
 createOutboundBudget({maximum:options.maximumCalls??48,cleanupReserve:1})
 return async(request:Request):Promise<Response>=>{
  try{
   const url=new URL(request.url)
   if(url.origin!==options.origin)return reply(403,'invalid-origin')
   const api=url.pathname==='/api'||url.pathname.startsWith('/api/')
   if(!api)return url.pathname.startsWith('/images/games/')?await serveStaticGameCover(request,options.assets):await options.assets(request)
   const supplied=request.headers.get('origin'),mutating=!['GET','HEAD','OPTIONS'].includes(request.method)
   if(supplied!==null&&supplied!==options.origin||mutating&&supplied!==options.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,'invalid-origin')
   const trusted=options.trustedTransport(request)
   const clientAddress=trusted?.clientAddress
   if(!trusted||typeof clientAddress!=='string'||clientAddress.length>64||clientAddress.includes('%')||!isIP(clientAddress))return reply(503,'transport-unavailable')
   const budget=createOutboundBudget({maximum:options.maximumCalls??48,cleanupReserve:1,fetcher:options.fetcher})
   const handler=await options.createApi({origin:options.origin,budget})
   const response=await handler(request,{clientAddress})
   if(response.status>=300&&response.status<400||response.status!==204&&!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')){
    await response.body?.cancel();return reply(503,'api-unavailable')
   }
   const headers=new Headers(response.headers)
   headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer')
   return new Response(response.body,{status:response.status,statusText:response.statusText,headers})
  }catch{return reply(503,'service-unavailable')}
 }
}
