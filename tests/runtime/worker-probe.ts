// Isolated local runtime proof only. Not a deployable application entry point.
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import {createAdminAuthorizer} from '../../server/auth/firebase-admin.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createRemoteCoverInspector,readPinnedCover} from '../../server/games/remote-cover.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
const origin='https://clipzone.test',time=1900000000
interface Fixtures {publicPem:string;valid:string;forged:string;noTotp:string;outsider:string}
function ensure(condition:unknown,label:string):asserts condition{if(!condition)throw Error(label)}
function memory():AtomicStore{
 const docs=new Map<string,RecordData>()
 return {get:async path=>structuredClone(docs.get(path)??null),transact:async work=>{
  const writes=new Map<string,RecordData>()
  const result=await work({get:async path=>structuredClone(docs.get(path)??null),set:(path,data)=>{writes.set(path,structuredClone(data))},create:(path,data)=>{ensure(!docs.has(path),'fixture-exists');writes.set(path,structuredClone(data))}})
  for(const [path,data]of writes)docs.set(path,data)
  return result
 }}
}
export default {
 async fetch(request:Request):Promise<Response>{
  if(new URL(request.url).pathname!=='/__runtime-proof'||request.method!=='POST')return new Response('Local test fixture only',{status:404})
  const passed:string[]=[]
  const check=(condition:unknown,label:string)=>{ensure(condition,label);passed.push(label)}
  try{
   const fixture=await request.json() as Fixtures
   ensure(typeof fixture.publicPem==='string'&&typeof fixture.valid==='string','fixtures-required')
   check(isIP('203.0.113.10')===4&&isIP('2001:db8::1')===6,'node:net IPv4/IPv6')
   let lookups=0,certificates=0
   const authorize=createAdminAuthorizer({projectId:'clipzone-test',apiKey:'fixture-only',allowedUids:['owner'],now:()=>new Date(time*1000),fetcher:async(url,options)=>{
    ensure(options?.redirect==='error','auth-redirect-policy')
    if(String(url).includes('/metadata/x509/')){certificates++;return Response.json({'key-1':fixture.publicPem},{headers:{'Cache-Control':'public, max-age=3600'}})}
    ensure(String(url)==='https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=fixture-only','unexpected-fetch')
    lookups++
    return Response.json({users:[{localId:'owner',email:'owner@example.test',emailVerified:true,validSince:String(time-100),mfaInfo:[{mfaEnrollmentId:'factor-1',totpInfo:{}}]}]})
   }})
   const authRequest=(token:string)=>new Request(origin+'/api/admin/session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}})
   check((await authorize(authRequest(fixture.valid))).uid==='owner','RS256 valid token and live account')
   for(const [label,token]of [['forged signature',fixture.forged],['missing TOTP',fixture.noTotp],['non-allowlisted UID',fixture.outsider]]){
    let denied=false;try{await authorize(authRequest(token))}catch{denied=true}check(denied,'deny '+label)
   }
   check(certificates===1&&lookups===1,'certificate cache preserves privileged account recheck boundary')
   const api=await createPublicApi({origin,store:memory(),now:()=>new Date(time*1000),network:{secret:'cd'.repeat(32)},visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('Provider forbidden in probe')}})
   const sessionRequest=(headers:Record<string,string>={})=>new Request(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:'{}'})
   const session=await api(sessionRequest(),{clientAddress:'203.0.113.10'}),cookie=session.headers.get('set-cookie')??''
   check(session.status===204&&cookie.includes('HttpOnly; Secure; SameSite=Strict'),'signed secure session cookie with WebCrypto HMAC')
   check((await api(sessionRequest({Cookie:cookie.split(';')[0]}),{clientAddress:'203.0.113.10'})).status===204,'signed cookie accepted')
   check((await api(sessionRequest({'cf-connecting-ip':'203.0.113.10','x-forwarded-for':'203.0.113.10'}))).status===503,'untrusted IP headers cannot supply transport context')
   check((await api(sessionRequest({Origin:'https://other.test'}),{clientAddress:'203.0.113.10'})).status===403,'foreign origin denied')
   check((await api(new Request(origin+'/api/unknown'))).status===404,'unknown API returns 404')
   let dnsBehavior=''
   try{await lookup('cdn.example.test',{all:true});dnsBehavior='unexpected-resolution'}catch(error){dnsBehavior=error instanceof Error?error.message:String(error)}
   check(/ENOTFOUND|not implemented|not supported|unsupported/i.test(dnsBehavior),'reserved .test DNS fails closed; runtime behavior recorded')
   let reads=0,resolves=0,coverDenied=false
   try{await createRemoteCoverInspector({resolve:async()=>{resolves++;return [{address:'127.0.0.1',family:4}]},read:async()=>{reads++;throw Error('No outbound cover connection permitted')}})('https://cdn.example.org/cover.png')}catch{coverDenied=true}
   check(coverDenied&&resolves===1&&reads===0,'cover inspector denies private DNS before transfer')
   const originalFetch=globalThis.fetch
   let fetchCalls=0,transportError=''
   globalThis.fetch=async()=>{fetchCalls++;throw Error('Outbound cover fetch forbidden in this proof')}
   try{
    try{await readPinnedCover(new URL('https://cdn.example.test/cover.png'),{address:'1.1.1.1',family:4},AbortSignal.timeout(1500))}catch(error){transportError=error instanceof Error?error.message:String(error)}
    check(fetchCalls===0&&/maxHeaderSize.*not implemented/.test(transportError),'current HTTPS cover transport rejects maxHeaderSize (known blocker)')
   }finally{globalThis.fetch=originalFetch}
   return Response.json({runtime:'workerd',passed,dnsBehavior,transportError,deployReady:false,blockers:['cover transport requires equivalent DNS/IP/TLS protection','REST budget needs bounded composition','CPU and remote edge behavior not measured']})
  }catch(error){return Response.json({passed,error:error instanceof Error?error.message:'probe-failed',deployReady:false},{status:500})}
 }
}
