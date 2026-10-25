// Synthetic stores/providers only. Counts application document operations, NOT billing.
import type {VideoEvidence} from '../../server/submissions/decision.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createAdminAuthorizer} from '../../server/auth/firebase-admin.ts'
import {buildRankingGeneration} from '../../server/ranking/generation.ts'
import {emptyRankingMetric} from '../../server/ranking/engagement.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
const origin='https://clipzone.test',shortId='a'.repeat(64),epoch='b'.repeat(32),at=new Date(1900000000000),now=()=>new Date(at)
export interface AuthFixture {publicPem:string;token:string}
export const workloadNames=['publication-cold','publication-warm','like','comment','auth-cold','auth-warm','moderation-remove','ranking-100'] as const
export type WorkloadName=typeof workloadNames[number]
const ensure=(ok:unknown)=>{if(!ok)throw Error('critical-workload-failed')}
function memory(){
 const docs=new Map<string,RecordData>(),counts={documentReads:0,queryMinimumReads:0,writes:0,deletes:0,transactions:0,authFetches:0}
 const get=async(path:string)=>{counts.documentReads++;return structuredClone(docs.get(path)??null)}
 const store:AtomicStore={get,snapshotGet:get,transact:async work=>{
  counts.transactions++;const writes=new Map<string,RecordData>(),deletes=new Set<string>()
  const result=await work({get,set:(path,data)=>{writes.set(path,structuredClone(data))},create:(path,data)=>{ensure(!docs.has(path));writes.set(path,structuredClone(data))},delete:path=>{deletes.add(path)},hasPublishedComment:async()=>{counts.queryMinimumReads++;return false}})
  for(const [path,data]of writes)docs.set(path,data)
  for(const path of deletes)docs.delete(path)
  counts.writes+=writes.size;counts.deletes+=deletes.size;return result
 },rankingSourcePage:async(after)=>{
  const items=[...docs].filter(([path])=>path.startsWith('shorts/')&&(!after||path.slice(7)>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([path,data])=>({id:path.slice(7),data:structuredClone(data)}))
  counts.queryMinimumReads+=Math.max(1,items.length);return {items,readTime:at.toISOString()}
 }}
 docs.set('games/game',{officialName:'Fixture',status:'active',source:'manual',createdAt:new Date(at.getTime()-86400000)})
 docs.set('shorts/'+shortId,{title:'Fixture',gameId:'game',platform:'YouTube',platformVideoId:'abcdefghijk',normalizedUrl:'https://www.youtube.com/shorts/abcdefghijk',moderationStatus:'published',createdAt:new Date(at.getTime()-1000),reviewVersion:0,commentCount:0,lastCommentNumber:0,likeCount:0})
 docs.set('rankingState/metrics',{version:1,ready:true,epoch})
 docs.set('rankingMetrics/'+shortId,emptyRankingMetric(shortId,'game',at,epoch))
 return {docs,store,counts,reset(){for(const key of Object.keys(counts) as Array<keyof typeof counts>)counts[key]=0}}
}
export async function prepareWorkload(name:WorkloadName,fixture:AuthFixture){
 const state=memory(),authorize=createAdminAuthorizer({projectId:'clipzone-test',apiKey:'fixture-only',allowedUids:['owner'],now,fetcher:async input=>{
  state.counts.authFetches++;return String(input).includes('/metadata/x509/')?Response.json({'key-1':fixture.publicPem},{headers:{'Cache-Control':'public, max-age=3600'}}):Response.json({users:[{localId:'owner',email:'owner@example.test',emailVerified:true,validSince:'1899999900',mfaInfo:[{mfaEnrollmentId:'factor-1',totpInfo:{}}]}]})
 }})
 const options={origin,store:state.store,now,visitorSecret:'ab'.repeat(32),network:{secret:'cd'.repeat(32)},maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async():Promise<VideoEvidence> =>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'confirmed',moderation:'clear',flags:[]}),admin:{publicConfig:{apiKey:'fixture-only',authDomain:'clipzone.test',projectId:'clipzone-test',appId:'fixture'},authorize}}
 let api=await createPublicApi(options)
 const request=(path:string,body:RecordData={},cookie='')=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json',Authorization:'Bearer '+fixture.token},body:JSON.stringify(body)})
 const session=await api(request('/api/session'),{clientAddress:'8.8.8.8'});ensure(session.status===204)
 const cookie=session.headers.get('set-cookie')!.split(';')[0]
 if(name==='auth-warm'||name==='moderation-remove')await authorize(request('/api/admin/session'))
 if(name==='ranking-100'){
  state.docs.delete('shorts/'+shortId);state.docs.delete('rankingMetrics/'+shortId)
  for(let i=0;i<100;i++){const id='s'+String(i).padStart(3,'0');state.docs.set('shorts/'+id,{title:'Fixture '+i,gameId:'game',platform:'Twitch',platformVideoId:'Fixture'+i,normalizedUrl:'https://clips.twitch.tv/Fixture'+i,moderationStatus:'published',likeCount:0,createdAt:new Date(at.getTime()-86400000)});state.docs.set('rankingMetrics/'+id,emptyRankingMetric(id,'game',at,epoch))}
 }
 state.reset()
 return async()=>{
  let status=200
  if(name==='ranking-100'){const result=await buildRankingGeneration({store:state.store,now});ensure(result.status==='ready'&&result.itemCount===100)}
  else{
   if(name==='publication-cold')api=await createPublicApi(options) // includes per-request crypto initialization
   const [path,body,expected]:[string,RecordData,number]=name.startsWith('publication')?['/api/shorts',{url:'https://www.youtube.com/shorts/abcdefghijk',gameId:'game'},201]:name==='like'?['/api/likes/set',{shortId,liked:true,revision:0},200]:name==='comment'?['/api/comments',{shortId,content:'Boa jogada!',requestId:crypto.randomUUID()},201]:name.startsWith('auth-')?['/api/admin/session',{},200]:['/api/admin/review',{shortId,action:'remove',revision:0,reportCount:0,reason:'Revisão administrativa de teste'},200]
   const response=await api(request(path,body,cookie),{clientAddress:'8.8.8.8'});status=response.status;const data=await response.json();if(status!==expected)throw Error('unexpected-'+name+'-'+status+'-'+JSON.stringify(data))
  }
  return {status,counts:{...state.counts},billingCertified:false}
 }
}
