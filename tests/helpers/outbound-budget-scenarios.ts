import {createOutboundBudget} from '../../server/runtime/outbound-budget.ts'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import type {RecordData} from '../../server/firestore/atomic-store.ts'
const origin='https://clipzone.test',root='projects/clipzone-budget-test/databases/(default)/documents',now=new Date('2026-10-25T12:00:00Z')
const ensure=(ok:unknown)=>{if(!ok)throw Error('invalid-budget-fixture')}
function document(path:string,data:RecordData){return {name:root+'/'+path,fields:Object.fromEntries(Object.entries(data).map(([key,value])=>{
 if(value instanceof Date)return [key,{timestampValue:value.toISOString()}]
 if(typeof value==='string')return [key,{stringValue:value}]
 if(typeof value==='number')return [key,{integerValue:String(value)}]
 if(typeof value==='boolean')return [key,{booleanValue:value}]
 throw Error('invalid-fixture-value')
}))}}
export async function runBudgetScenario(options:{maximum?:number;aborts?:number;shared?:boolean;failCredential?:boolean;failCleanup?:boolean}={}){
 const docs=new Map<string,ReturnType<typeof document>>(),generationId='a'.repeat(32),epoch='b'.repeat(32),rows:Array<{id:string;data:RecordData}>=[]
 docs.set('rankingState/current',document('rankingState/current',{version:1,generationId,computedAt:new Date(now.getTime()-1000),metricsEpoch:epoch}))
 docs.set('rankingState/metrics',document('rankingState/metrics',{version:1,ready:true,epoch}))
 for(let i=0;i<30;i++){
  const id='s'+String(i).padStart(2,'0'),gameId=options.shared?'shared':'g'+i,data={gameId,moderationStatus:'published',createdAt:new Date(now.getTime()-1000-i*1000),title:'Clip '+i,platform:'Twitch',platformVideoId:'BudgetProof'+i,normalizedUrl:'https://clips.twitch.tv/BudgetProof'+i,likeCount:0}
  docs.set('shorts/'+id,document('shorts/'+id,data));docs.set('games/'+gameId,document('games/'+gameId,{status:options.shared||i<14?'active':'hidden',officialName:'Game',source:'manual'}));rows.push({id,data})
 }
 const operations:string[]=[],policies:string[]=[],retryTokens:string[]=[]
 let commits=0,committedQuota=0,transactions=0,oauth=0,businessWrites=0
 const upstream:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));policies.push(init?.redirect??'')
  if(url.origin==='https://oauth.example.test'){
   ensure(url.pathname==='/token');operations.push('oauth');oauth++
   return options.failCredential?Response.json({private:'oauth-private-detail'},{status:503}):Response.json({access_token:'fixture-server-only'})
  }
  ensure(url.origin==='https://firestore.googleapis.com'&&url.pathname.startsWith('/v1/'+root+':'))
  ensure(new Headers(init?.headers).get('authorization')==='Bearer fixture-server-only')
  const operation=url.pathname.split(':').at(-1)!,body=JSON.parse(String(init?.body));operations.push(operation)
  if(operation==='beginTransaction'){transactions++;retryTokens.push(body.options.readWrite.retryTransaction??'');return Response.json({transaction:'fixture-'+transactions})}
  if(operation==='rollback'){if(options.failCleanup)throw Error('private-cleanup-detail');return Response.json({})}
  if(operation==='commit'){
   commits++
   if(commits<=(options.aborts??0))return Response.json({error:{status:'ABORTED'}},{status:409})
   for(const write of body.writes){const path=String(write.update.name).slice(root.length+1);if(!path.startsWith('publicReadAttempts/'))businessWrites++;else committedQuota++;docs.set(path,write.update)}
   return Response.json({})
  }
  if(operation==='batchGet')return Response.json(body.documents.map((name:string)=>{const found=docs.get(name.slice(root.length+1));return found?{found}:{missing:name}}).reverse())
  ensure(operation==='runQuery');const relevant=body.structuredQuery.from[0].collectionId==='rankingItems'
  const candidates=rows.map(row=>({id:relevant?'rank-'+row.id:row.id,document:document((relevant?'rankingItems/rank-':'shorts/')+row.id,relevant?{shortId:row.id,createdAt:row.data.createdAt,score:0,generationId}:row.data)}))
  const after=body.structuredQuery.startAt?.values.at(-1).referenceValue.split('/').at(-1),start=after?candidates.findIndex(row=>row.id===after)+1:0
  return Response.json(candidates.slice(start,start+15).map(row=>({document:row.document,readTime:now.toISOString()})))
 }
 const budget=createOutboundBudget({maximum:options.maximum??48,cleanupReserve:1,fetcher:upstream})
 let credential:string|undefined
 const accessToken=async()=>{
  if(!credential){const response=await budget.fetch('https://oauth.example.test/token',{method:'POST'});if(!response.ok)throw Error('private-credential-detail');credential=(await response.json() as {access_token:string}).access_token}
  return credential
 }
 const store=createRestStore({projectId:'clipzone-budget-test',accessToken,fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
 const api=await createPublicApi({origin,store,now:()=>now,visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('no-provider-in-fixture')}})
 const request=(path:string,cookie='',body:RecordData={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const session=await api(request('/api/session'));ensure(session.status===204)
 const cookie=session.headers.get('set-cookie')!.split(';')[0]
 const response=await api(request('/api/feed/ordered',cookie,{order:'latest'})),body=await response.json() as {error?:string;items?:unknown[];next?:string;limited?:boolean}
 if(response.status===503)ensure(Object.keys(body).length===1&&body.error==='unavailable')
 return {status:response.status,error:body.error??null,items:body.items?.length??null,hasContinuation:!!body.next,limited:body.limited??false,cache:response.headers.get('cache-control'),usage:budget.usage(),operations,commits,committedQuota,businessWrites,transactions,oauth,retryTokens,allRedirectsExplicit:policies.every(policy=>policy==='error')}
}
export async function runBudgetProof(){
 const results=[]
 for(const [name,options]of [
  ['cold credential + worst measured mix',{}],
  ['two transaction retries then bounded failure',{aborts:2}],
  ['two retries recover with shared game',{aborts:2,shared:true}],
  ['reserved rollback after interruption',{maximum:6,aborts:2}],
  ['rollback failure remains private',{maximum:6,aborts:2,failCleanup:true}],
  ['credential failure sends no Firestore request',{failCredential:true}],
 ] as Array<[string,Parameters<typeof runBudgetScenario>[0]]>){
  const result=await runBudgetScenario(options)
  ensure(result.businessWrites===0&&result.allRedirectsExplicit&&result.cache==='no-store')
  ensure(result.usage.dispatched===result.operations.length)
  if(name.startsWith('cold'))ensure(result.status===200&&result.items===14&&result.hasContinuation&&result.limited&&result.usage.dispatched===44&&result.committedQuota===1)
  else if(name.includes('recover'))ensure(result.status===200&&result.items===15&&result.commits===3&&result.committedQuota===1&&result.retryTokens.join(',')===',fixture-1,fixture-2')
  else{
   ensure(result.status===503&&result.error==='unavailable'&&result.items===null)
   if(name.startsWith('two'))ensure(result.usage.dispatched===47&&result.commits===3&&result.committedQuota===1)
   else if(name.startsWith('credential'))ensure(result.usage.dispatched===1&&result.transactions===0)
   else ensure(result.usage.dispatched===6&&result.operations.at(-1)==='rollback'&&result.committedQuota===0)
  }
  results.push({name,...result})
 }
 return results
}
