import {createWorkerEntry} from '../../server/runtime/worker-entry.ts'
import workerMain from '../../server/runtime/cloudflare-main.ts'
const origin='https://clipzone.test'
const check=(value:unknown)=>{if(!value)throw Error('api-header-proof-failed')}
const request=(url=origin+'/api/test',headers:Record<string,string>={Origin:origin})=>new Request(url,{method:'POST',headers,body:'{"value":7}'})
const base=()=>({origin,assets:async()=>new Response('asset',{headers:{'Cache-Control':'public, max-age=60'}}),trustedTransport:()=>({clientAddress:'203.0.113.10'}),createApi:async()=>async()=>Response.json({ok:true})})
function policy(response:Response){
 check(response.headers.get('strict-transport-security')==='max-age=86400')
 check(response.headers.get('cache-control')==='no-store'&&response.headers.get('referrer-policy')==='no-referrer'&&response.headers.get('x-content-type-options')==='nosniff')
 check(!response.headers.has('access-control-allow-origin')&&!response.headers.has('content-security-policy')&&!response.headers.has('cross-origin-opener-policy')&&!response.headers.has('cross-origin-embedder-policy'))
}
export const workerApiHeaderCases:Array<{name:string;run:()=>Promise<void>}>=[]
const add=(name:string,run:()=>Promise<void>)=>workerApiHeaderCases.push({name,run})
add('successful JSON preserves request/body/status and conservative HTTPS policy without cross-origin restrictions',async()=>{
 const entry=createWorkerEntry({...base(),createApi:async()=>async req=>new Response(JSON.stringify(await req.json()),{status:202,statusText:'Accepted',headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=999','X-Fixture':'preserved'}})})
 const response=await entry(request());policy(response);check(response.status===202&&response.statusText==='Accepted'&&response.headers.get('x-fixture')==='preserved'&&(await response.json() as {value:number}).value===7)
})
add('204 session keeps secure cookie and empty body while receiving HTTPS policy',async()=>{
 const cookie='__Host-fixture=test; Secure; HttpOnly; SameSite=Strict; Path=/'
 const entry=createWorkerEntry({...base(),createApi:async()=>async()=>new Response(null,{status:204,headers:{'Set-Cookie':cookie}})})
 const response=await entry(request());policy(response);check(response.status===204&&response.headers.get('set-cookie')===cookie&&await response.text()==='')
})
add('origin rejection, missing trusted transport, HTML, redirects and construction failures all have protected errors',async()=>{
 for(const kind of ['origin','transport','html','redirect','factory']){
  let assets=0
  const entry=createWorkerEntry({...base(),assets:async()=>{assets++;return new Response('must not appear')},trustedTransport:()=>kind==='transport'?undefined:{clientAddress:'203.0.113.10'},createApi:async()=>{if(kind==='factory')throw Error('private-error');return async()=>kind==='html'?new Response('private html',{headers:{'Content-Type':'text/html'}}):kind==='redirect'?Response.redirect(origin+'/admin',302):Response.json({ok:true})}})
  const response=await entry(request(undefined,kind==='origin'?{Origin:'https://foreign.test'}:undefined));policy(response)
  check(response.status===(kind==='origin'?403:503)&&assets===0&&!response.headers.has('location')&&!(await response.text()).includes('private'))
 }
})
add('auth, validation, method, quota and server error statuses keep JSON, Allow and Retry-After',async()=>{
 for(const status of [401,403,404,405,413,422,429,500]){
  const entry=createWorkerEntry({...base(),createApi:async()=>async()=>Response.json({error:'fixture-refusal'},{status,headers:{Allow:'POST','Retry-After':'60'}})})
  const response=await entry(request());policy(response);check(response.status===status&&response.headers.get('allow')==='POST'&&response.headers.get('retry-after')==='60'&&(await response.json() as {error:string}).error==='fixture-refusal')
 }
})
add('HTTP is refused without claiming HSTS even when forwarded-proto says HTTPS',async()=>{
 let opened=0;const entry=createWorkerEntry({...base(),createApi:async()=>{opened++;return async()=>Response.json({ok:true})}})
 const response=await entry(request('http://clipzone.test/api/test',{Origin:origin,'X-Forwarded-Proto':'https'}))
 check(response.status===403&&!response.headers.has('strict-transport-security')&&response.headers.get('cache-control')==='no-store'&&opened===0)
})
add('static assets bypass API factory and retain their own cache and policy',async()=>{
 let opened=0;const asset=new Response('asset fixture',{headers:{'Cache-Control':'public, max-age=31536000, immutable','Strict-Transport-Security':'max-age=123','Referrer-Policy':'strict-origin-when-cross-origin'}})
 const entry=createWorkerEntry({...base(),assets:async()=>asset,createApi:async()=>{opened++;return async()=>Response.json({ok:true})}})
 const response=await entry(new Request(origin+'/assets/fixture-hash.js'))
 check(response===asset&&opened===0&&response.headers.get('cache-control')?.includes('immutable')&&response.headers.get('strict-transport-security')==='max-age=123'&&response.headers.get('referrer-policy')==='strict-origin-when-cross-origin')
})
add('outer Cloudflare bootstrap exception is sanitized and receives HTTPS/referrer/no-store policy',async()=>{
 const response=await workerMain.fetch(request(),{CLIPZONE_ORIGIN:origin} as Parameters<typeof workerMain.fetch>[1])
 policy(response);check(response.status===503&&(await response.json() as {error:string}).error==='service-unavailable')
})
add('outer Cloudflare invalid origin error is protected without initializing app or assets',async()=>{
 let assets=0;const response=await workerMain.fetch(new Request('https://foreign.test/icon.png'),{CLIPZONE_ORIGIN:origin,ASSETS:{fetch:async()=>{assets++;return new Response('asset')}}} as Parameters<typeof workerMain.fetch>[1])
 policy(response);check(response.status===403&&assets===0&&(await response.json() as {error:string}).error==='invalid-origin')
})
