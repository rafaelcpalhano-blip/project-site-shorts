// Local-only conformance fixture, never a production entry point.
import {createAdminAuthorizer,AdminAuthError} from '../../server/auth/firebase-admin.ts'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {readOrderedFeed} from '../../server/ranking/read-feed.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
interface Fixtures {certificate:string;valid:string;forged:string;noTotp:string;outsider:string}
interface Env {ASSETS:{fetch:(request:Request)=>Promise<Response>}}
const origin='https://clipzone.test',time=1900000000
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
const root='projects/clipzone-runtime-test/databases/(default)/documents'
function document(path:string,data:RecordData){
 return {name:root+'/'+path,fields:Object.fromEntries(Object.entries(data).map(([key,value])=>{
  if(value instanceof Date)return [key,{timestampValue:value.toISOString()}]
  if(typeof value==='string')return [key,{stringValue:value}]
  if(typeof value==='number')return [key,{integerValue:String(value)}]
  if(typeof value==='boolean')return [key,{booleanValue:value}]
  throw Error('unsupported-fixture-value')
 }))}
}
async function proof(fixture:Fixtures){
 const passed:string[]=[],check=(condition:unknown,label:string)=>{ensure(condition,label);passed.push(label)}
 ensure(fixture.certificate.includes('-----BEGIN CERTIFICATE-----'),'X509 fixture required')
 const user={localId:'owner',email:'owner@example.test',emailVerified:true,validSince:String(time-100),mfaInfo:[{mfaEnrollmentId:'factor-1',totpInfo:{}}]}
 let account:RecordData=structuredClone(user),certificates=0,lookups=0,upstreamUnavailable=false
 const authorize=createAdminAuthorizer({projectId:'clipzone-test',apiKey:'fixture-only',allowedUids:['owner'],now:()=>new Date(time*1000),fetcher:async(url,options)=>{
  ensure(options?.redirect==='error','auth-redirect-policy')
  if(String(url).includes('/metadata/x509/')){certificates++;return Response.json({'key-1':fixture.certificate},{headers:{'Cache-Control':'public, max-age=3600'}})}
  ensure(String(url)==='https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=fixture-only','unexpected-auth-fetch')
  lookups++
  return upstreamUnavailable?new Response('unavailable',{status:503}):Response.json({users:[account]})
 }})
 const authRequest=(token:string)=>new Request(origin+'/api/admin/session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}})
 const denied=async(work:()=>Promise<unknown>,status?:number)=>{try{await work();return false}catch(error){return status===undefined||error instanceof AdminAuthError&&error.status===status}}
 check((await authorize(authRequest(fixture.valid))).uid==='owner','RS256 verified with X509 certificate')
 for(const [label,token]of [['forged signature',fixture.forged],['missing TOTP',fixture.noTotp],['outsider UID',fixture.outsider]])check(await denied(()=>authorize(authRequest(token))),'deny '+label)
 check(certificates===1&&lookups===1,'cached certificate never authorizes rejected claims')
 for(const [label,patch]of [['disabled account',{disabled:true}],['revoked session',{validSince:String(time+1)}],['removed MFA',{mfaInfo:[]}] ] as Array<[string,RecordData]>){
  account={...structuredClone(user),...patch};check(await denied(()=>authorize(authRequest(fixture.valid)),401),'deny '+label)
 }
 account=structuredClone(user)
 const before=lookups
 await authorize(authRequest(fixture.valid));await authorize(authRequest(fixture.valid))
 check(lookups===before+2&&certificates===1,'current account rechecked despite cached certificate')
 upstreamUnavailable=true
 check(await denied(()=>authorize(authRequest(fixture.valid)),503),'upstream auth failure grants no access')
 const unconfigured=createAdminAuthorizer({projectId:'clipzone-test',apiKey:'fixture-only',allowedUids:[],fetcher:async()=>{throw Error('must-not-fetch')}})
 check(await denied(()=>unconfigured(authRequest(fixture.valid)),503),'empty admin allowlist fails closed')

 let missing=false
 try{createRestStore({projectId:'clipzone-runtime-test'})}catch{missing=true}
 check(missing,'remote store refuses missing credential supplier')
 const originalFetch=globalThis.fetch
 let token='fixture-first',credentialFailure=false,calls=0
 const authorization:string[]=[]
 try{
  globalThis.fetch=async(input,init)=>{
   ensure(String(input)==='https://firestore.googleapis.com/v1/'+root+':batchGet','unexpected-store-fetch')
   calls++;authorization.push(new Headers(init?.headers).get('authorization')??'')
   return Response.json([{found:document('games/b',{officialName:'B'})},{missing:root+'/games/a'}])
  }
  const store=createRestStore({projectId:'clipzone-runtime-test',accessToken:async()=>{if(credentialFailure)throw Error('fixture-credential-unavailable');return token}})
  const rows=await store.getMany!(['games/a','games/b'])
  check(rows[0]===null&&rows[1]?.officialName==='B','REST batch maps unordered found/missing in workerd')
  token='fixture-second';await store.getMany!(['games/a','games/b'])
  check(authorization.join(',')==='Bearer fixture-first,Bearer fixture-second','REST rereads credential supplier on next request')
  credentialFailure=true
  check(await denied(()=>store.getMany!(['games/a','games/b']))&&calls===2,'credential supplier failure prevents outbound request')
 }finally{globalThis.fetch=originalFetch}

 for(const hidden of [false,true]){
  const docs=new Map<string,ReturnType<typeof document>>(),rows:Array<{id:string;document:ReturnType<typeof document>}>=[],at=new Date('2026-10-25T12:00:00Z')
  for(let i=0;i<30;i++){
   const id='s'+String(i).padStart(2,'0'),gameId=hidden?'g'+i:'shared'
   const data={gameId,moderationStatus:'published',createdAt:new Date(at.getTime()-1000-i*1000),title:'Clip '+i,platform:'Twitch',platformVideoId:'WorkerBatch'+i,normalizedUrl:'https://clips.twitch.tv/WorkerBatch'+i,likeCount:0}
   docs.set('shorts/'+id,document('shorts/'+id,data));docs.set('games/'+gameId,document('games/'+gameId,{status:hidden?'hidden':'active',officialName:'Game',source:'manual'}));rows.push({id,document:document('shorts/'+id,data)})
  }
  let requests=0
  try{
   globalThis.fetch=async(input,init)=>{
    const url=new URL(String(input));ensure(url.origin==='https://firestore.googleapis.com'&&url.pathname.startsWith('/v1/'+root+':'),'unexpected-feed-fetch')
    requests++;const body=JSON.parse(String(init?.body))
    if(url.pathname.endsWith(':batchGet')){
     ensure(body.documents.length<=4,'batch-too-large')
     return Response.json(body.documents.map((name:string)=>{const found=docs.get(name.slice(root.length+1));return found?{found}:{missing:name}}).reverse())
    }
    ensure(url.pathname.endsWith(':runQuery'),'unexpected-operation')
    const after=body.structuredQuery.startAt?.values.at(-1).referenceValue.split('/').at(-1),start=after?rows.findIndex(row=>row.id===after)+1:0
    return Response.json(rows.slice(start,start+15).map(row=>({document:row.document,readTime:at.toISOString()})))
   }
   const page=await readOrderedFeed({},{store:createRestStore({projectId:'clipzone-runtime-test',accessToken:async()=>'fixture-only'}),now:()=>at})
   check(hidden?page.items.length===0&&page.candidatesExamined===30&&page.limited&&!!page.next&&requests===18:page.items.length===15&&page.items[0].id==='s00'&&page.items[14].id==='s14'&&!!page.next&&requests===6,hidden?'hidden feed remains empty with bounded batches and continuation':'visible feed preserves order and DTO through REST batches')
  }finally{globalThis.fetch=originalFetch}
 }
 return {runtime:'workerd',passed,deployReady:false,limits:['synthetic X509/account/credential fixtures only','no real OAuth supplier or Google calls','no edge IP attestation or CPU quota proof','external cover decision unresolved']}
}
let api:Promise<Awaited<ReturnType<typeof createPublicApi>>>|undefined
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const path=new URL(request.url).pathname
  if(path==='/__integration-proof'&&request.method==='POST'){
   try{return Response.json(await proof(await request.json() as Fixtures))}catch(error){return Response.json({error:error instanceof Error?error.message:'proof-failed',deployReady:false},{status:500})}
  }
  if(path==='/api'||path.startsWith('/api/')){
   api??=createPublicApi({origin,store:memory(),visitorSecret:'ab'.repeat(32),network:{secret:'cd'.repeat(32)},now:()=>new Date(time*1000),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('no-provider-in-fixture')}})
   // No client IP is taken from request headers in this local conformance fixture.
   return (await api)(request)
  }
  return env.ASSETS.fetch(request)
 }
}
