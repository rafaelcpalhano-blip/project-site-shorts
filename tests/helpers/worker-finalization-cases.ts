import {loadUpdates} from '../../server/admin/updates.ts'
import {loadCommentQueue} from '../../server/comments/queue.ts'
import main from '../../server/runtime/cloudflare-main.ts'
import {restFixture} from './portable-rest-fixture.ts'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createOutboundBudget} from '../../server/runtime/outbound-budget.ts'
import {createWorkerFetch} from '../../server/runtime/worker-fetch.ts'
import {runWorkerMaintenance} from '../../server/runtime/worker-maintenance.ts'
import {createServiceKeySigner} from '../../server/auth/service-key.ts'
import {createServiceTokenProvider} from '../../server/auth/service-token.ts'
import {initializeEmptyDatabase} from '../../server/runtime/empty-database.ts'
import {createCloudflareApplication} from '../../server/runtime/cloudflare-application.ts'
import {stepRankingGeneration} from '../../server/ranking/segmented-generation.ts'
import {cleanupNetworkAbuse} from '../../server/security/network-retention.ts'
import {cleanupLikes} from '../../server/likes/retention.ts'
import {pruneRankingGeneration} from '../../server/ranking/retention.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'

function check(value:unknown){if(!value)throw Error('finalization-proof-failed')}
async function refuses(work:()=>unknown,pattern:RegExp){try{await work()}catch(error){check(pattern.test((error as Error).message));return}throw Error('expected-refusal')}
let keys:Promise<{pem:string;pair:CryptoKeyPair}>|undefined
async function key(){return keys??=(async()=>{const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);const raw=await crypto.subtle.exportKey('pkcs8',pair.privateKey);return {pair,pem:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(raw).toString('base64')+'\n-----END PRIVATE KEY-----'}})()}
function memory(count=0){
 const at=new Date('2026-10-25T12:00:00Z'),epoch='a'.repeat(32),docs=new Map<string,RecordData>(),snapshots=new Map<string,Map<string,RecordData>>()
 let clock=at.getTime(),tail:Promise<unknown>=Promise.resolve(),rpc=0,lost=false
 docs.set('rankingState/metrics',{version:1,ready:true,epoch})
 for(let n=0;n<count;n++){
  const id='s'+String(n).padStart(3,'0'),gameId='g'+n
  docs.set('games/'+gameId,{officialName:'Jogo '+n,status:'active',createdAt:new Date(at.getTime()-3*86400000)})
  docs.set('shorts/'+id,{gameId,moderationStatus:'published',createdAt:new Date(at.getTime()-86400000),likeCount:2})
  docs.set('rankingMetrics/'+id,{version:1,ready:true,epoch,shortId:id,gameId,likeMass:1,commentMass:1,commentContributors:1,asOf:new Date(at.getTime()-3600000)})
 }
 const store:AtomicStore={get:async p=>{rpc++;return structuredClone(docs.get(p)??null)},
  snapshotGet:async(p,point)=>{rpc++;return structuredClone(snapshots.get(point)?.get(p)??null)},
  rankingSourcePage:async(after,point)=>{rpc++;point??=new Date(clock).toISOString();if(!snapshots.has(point))snapshots.set(point,structuredClone(docs));return {readTime:point,items:[...snapshots.get(point)!].filter(([p])=>p.startsWith('shorts/')&&(!after||p.slice(7)>after)).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,30).map(([p,data])=>({id:p.slice(7),data:structuredClone(data)}))}},
  transact<T>(work:Parameters<AtomicStore['transact']>[0]):Promise<T>{
   const result=tail.then(async()=>{rpc++;const writes=new Map<string,RecordData>(),removed:string[]=[]
    const value=await work({get:async p=>{check(writes.size===0&&removed.length===0);rpc++;return structuredClone(docs.get(p)??null)},create:(p,d)=>{check(!docs.has(p)&&!writes.has(p));writes.set(p,structuredClone(d))},set:(p,d)=>writes.set(p,structuredClone(d)),delete:p=>removed.push(p)})
    rpc++;for(const [p,d]of writes)docs.set(p,d);for(const p of removed)docs.delete(p)
    if(lost&&[...writes].some(([p])=>p.startsWith('rankingItems/'))){lost=false;throw Error('transport-response-lost')}
    return value
   });tail=result.catch(()=>{});return result as Promise<T>
  },
 }
 return {store,docs,epoch,snapshots,now:()=>new Date(clock),advance:(ms=60000)=>{clock+=ms},rpc:()=>rpc,loseStageResponse:()=>{lost=true}}
}
export const finalizationMetrics:Record<string,unknown>={}
export const finalizationCases:Array<{name:string;run:()=>Promise<void>}>=[]
const add=(name:string,run:()=>Promise<void>)=>finalizationCases.push({name,run})
add('PKCS8 signer verifies real RSA and rejects malformed or weak keys without exposing secret',async()=>{
 const fixture=await key(),sign=createServiceKeySigner(fixture.pem),bytes=new TextEncoder().encode('fixture assertion')
 check(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',fixture.pair.publicKey,new Uint8Array(await sign(bytes)),bytes))
 for(const pem of ['PRIVATE SECRET','-----BEGIN RSA PRIVATE KEY-----\nAA==\n-----END RSA PRIVATE KEY-----','-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----'])await refuses(async()=>createServiceKeySigner(pem)(bytes),/^server-credential-unavailable$/)
 const weak=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:1024,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify'])
 const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',weak.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'
 await refuses(()=>createServiceKeySigner(pem)(bytes),/^server-credential-unavailable$/)
})
add('shared credential cache refresh dispatches using current invocation transport',async()=>{
 const fixture=await key();let time=1900000000000,first=0,second=0
 const provider=createServiceTokenProvider({projectId:'clipzone-fixture',clientEmail:'clipzone-runtime@clipzone-fixture.iam.gserviceaccount.com',sign:createServiceKeySigner(fixture.pem),now:()=>new Date(time)})
 const one=provider(async()=>{first++;return Response.json({access_token:'one',token_type:'Bearer',expires_in:3600})}),two=provider(async()=>{second++;return Response.json({access_token:'two',token_type:'Bearer',expires_in:3600})})
 check(await one()==='one'&&await two()==='one'&&first===1&&second===0)
 time+=3540000;check(await two()==='two'&&first===1&&second===1)
})
add('empty initialization refuses content or active writers; three creates are atomic and never reset markers',async()=>{
 const d=memory();d.docs.clear();const options={store:d.store,inspect:async()=>({rootCollectionIds:[] as string[]}),writersStopped:true,epoch:d.epoch,at:d.now()}
 await refuses(()=>initializeEmptyDatabase({...options,writersStopped:false}),/writers-active/)
 await refuses(()=>initializeEmptyDatabase({...options,inspect:async()=>({rootCollectionIds:['shorts']})}),/not-empty/)
 check(d.docs.size===0)
 const result=await initializeEmptyDatabase(options);check(result.created.length===3&&d.docs.get('adminQueueState/reportTitles')?.ready===true&&d.docs.size===3)
 const before=JSON.stringify([...d.docs]);await refuses(()=>initializeEmptyDatabase(options),/marker-exists/);check(JSON.stringify([...d.docs])===before)
})
add('Workers composition refuses wrong projects and incomplete config before external I/O',async()=>{
 const fixture=await key();let calls=0
 const config={origin:'https://preview.clipzone.example',projectId:'clipzone-db02a',authProjectId:'clipzone-db02a',serviceEmail:'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',servicePrivateKey:fixture.pem,visitorSecret:'ab'.repeat(32),networkSecret:'cd'.repeat(32),authApiKey:'fixture',authAppId:'1:818748049569:web:c73f2f86ab6e589f6a88e0',adminUids:['fixture-admin'],twitchClientId:'fixture',twitchClientSecret:'fixture',youtubeApiKey:'fixture'}
 const ports={assets:async()=>new Response('asset'),fetcher:async()=>{calls++;throw Error('no-network')},now:()=>new Date(1900000000000)}
 for(const patch of [{projectId:'clipzone-db02a2'},{authProjectId:'other-project'},{origin:'http://localhost:5174'},{adminUids:[]},{networkSecret:config.visitorSecret}])await refuses(async()=>createCloudflareApplication({...config,...patch},ports),/^worker-configuration-unavailable$/)
 const entry=createCloudflareApplication(config,ports)
 check((await entry(new Request(config.origin+'/asset.js'))).status===200&&calls===0)
 check((await entry(new Request(config.origin+'/api/admin/config'))).status===503&&calls===0)
 const request=new Request(config.origin+'/api/admin/config',{headers:{'CF-Connecting-IP':'8.8.8.8'}});Object.defineProperty(request,'cf',{value:{colo:'GRU',httpProtocol:'HTTP/2'}})
 const response=await entry(request);check(response.status===200&&response.headers.get('cache-control')==='no-store'&&calls===0)
})
add('100 distinct-game sources resume across invocations and publish only after all staging, within modeled call ceiling',async()=>{
 const d=memory(100);let result:Awaited<ReturnType<typeof stepRankingGeneration>>|undefined,steps=0,maxCalls=0
 while(result?.status!=='ready'){
  const before=d.rpc();result=await stepRankingGeneration(d);maxCalls=Math.max(maxCalls,d.rpc()-before);steps++
  if(result.status!=='ready')check(!d.docs.has('rankingState/current'))
  check(steps<25);d.advance()
 }
 check(result.itemCount===100&&maxCalls<=40&&[...d.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length===100)
 check((await stepRankingGeneration(d)).status==='not-due')
})
add('snapshot is stable even if live sources change between ranking steps',async()=>{
 const d=memory(31);await stepRankingGeneration(d);await stepRankingGeneration(d)
 d.docs.get('rankingMetrics/s030')!.likeMass=999
 let result;for(let n=0;n<15;n++){result=await stepRankingGeneration(d);if(result.status==='ready')break;d.advance()}
 check(result?.status==='ready'&&result.itemCount===31)
})
add('concurrent ranking steps do not double stage; lost stage response resumes from committed checkpoint',async()=>{
 const d=memory(2);await stepRankingGeneration(d)
 const parallel=await Promise.all([stepRankingGeneration(d),stepRankingGeneration(d)]);check(parallel.some(r=>r.status==='busy'))
 d.loseStageResponse();await refuses(()=>stepRankingGeneration(d),/transport-response-lost/)
 check(!d.docs.has('rankingState/current'))
 check((await stepRankingGeneration(d)).status==='ready');check([...d.docs.keys()].filter(p=>p.startsWith('rankingItems/')).length===2)
})
add('bad metrics, oversize generation, expired lease and budget never replace valid pointer',async()=>{
 for(const mode of ['metric','limit','lease','budget']){
  const d=memory(mode==='limit'?101:1),old='f'.repeat(32)
  d.docs.set('rankingState/current',{generationId:old,computedAt:new Date(d.now().getTime()-7200000),publishedAt:new Date(d.now().getTime()-7200000)})
  if(mode==='budget')d.docs.set('rankingBudgets/'+d.now().toISOString().slice(0,10),{version:1,readsReserved:20000,writesReserved:0,deletesReserved:0})
  if(mode==='metric')d.docs.delete('rankingMetrics/s000')
  if(mode==='lease'){await stepRankingGeneration(d);d.advance(6*60000)}
  let failed=false
  for(let n=0;n<25;n++){try{await stepRankingGeneration(d);d.advance()}catch{failed=true;break}}
  check(failed&&d.docs.get('rankingState/current')?.generationId===old)
 }
})
add('bounded network and like retention preserve records beyond slice and continue with exact cursor',async()=>{
 const d=memory(),ids=Array.from({length:12},(_,n)=>n.toString(16).padStart(64,'0'))
 for(const id of ids)d.docs.set('networkAbuse/'+id,{expiresAt:new Date(d.now().getTime()-1000)})
 d.store.expiredNetworkRecords=async()=>ids.filter(id=>d.docs.has('networkAbuse/'+id)).map(id=>({id,data:d.docs.get('networkAbuse/'+id)!}))
 const result=await cleanupNetworkAbuse({...d,maximumRecords:8});check(result.deleted===8&&result.examined===8&&result.more&&d.docs.has('networkAbuse/'+ids[8]))
 for(const id of ids)d.docs.set('likeAttempts/'+id,{count:1,startsAt:new Date(d.now().getTime()-100*86400000),updatedAt:new Date(d.now().getTime()-100*86400000)})
 d.store.scanLikeRecords=async(collection,after)=>ids.filter(id=>(!after||id>after)&&d.docs.has(collection+'/'+id)).map(id=>({id,data:d.docs.get(collection+'/'+id)!}))
 const first=await cleanupLikes({...d,collection:'likeAttempts',maximumRecords:8,apply:true});check(first.deleted===8&&first.next===ids[7])
 const second=await cleanupLikes({...d,collection:'likeAttempts',maximumRecords:8,apply:true,after:first.next!});check(second.deleted===4&&second.next===null)
})
add('ranking retention slice never deletes run while unprocessed staging items remain',async()=>{
 const d=memory(),id='c'.repeat(32);d.docs.set('rankingRuns/'+id,{status:'failed',startedAt:new Date(d.now().getTime()-3*3600000)})
 for(let n=0;n<20;n++)d.docs.set('rankingItems/'+id+'_'+n,{generationId:id})
 d.store.rankingItemsPage=async gen=>[...d.docs].filter(([p,v])=>p.startsWith('rankingItems/')&&v.generationId===gen).slice(0,30).map(([p,data])=>({id:p.split('/')[1],data}))
 const first=await pruneRankingGeneration({...d,generationId:id,maximumRecords:15});check(!first.complete&&first.deleted===15&&d.docs.has('rankingRuns/'+id))
 const second=await pruneRankingGeneration({...d,generationId:id,maximumRecords:15});check(second.complete&&second.deleted===6&&!d.docs.has('rankingRuns/'+id))
})

add('real REST adapter dispatches each 100-game ranking step under the per-invocation budget',async()=>{
 const seed=memory(100),fixture=restFixture(seed.docs,seed.now);let result:Awaited<ReturnType<typeof stepRankingGeneration>>|undefined,maxCalls=0,steps=0
 while(result?.status!=='ready'){
  const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:createWorkerFetch(fixture.fetcher)})
  const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
  result=await stepRankingGeneration({store,now:seed.now});maxCalls=Math.max(maxCalls,budget.usage().dispatched);steps++;seed.advance();check(steps<25)
 }
 check(result.itemCount===100&&maxCalls<=40&&fixture.docs.get('rankingState/current')?.generationId===result.generationId)
 finalizationMetrics.rankingRest={items:100,steps,maxCalls,oauthExcluded:true}
})
add('scheduled network slice including not-due ranking and OAuth stays bounded with real REST adapter',async()=>{
 const seed=memory();seed.docs.set('rankingState/current',{generationId:'b'.repeat(32),publishedAt:seed.now()})
 for(let n=0;n<12;n++)seed.docs.set('networkAbuse/'+n.toString(16).padStart(64,'0'),{expiresAt:new Date(seed.now().getTime()-1000)})
 const fixture=restFixture(seed.docs,seed.now),budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:createWorkerFetch(fixture.fetcher)})
 const supplier=createServiceTokenProvider({projectId:'clipzone-db02a',clientEmail:'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',sign:createServiceKeySigner((await key()).pem),now:seed.now})(budget.fetch)
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:supplier,fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
 const result=await runWorkerMaintenance({store,now:seed.now})
 check(result.task==='network-retention'&&fixture.docs.size===6&&fixture.oauth()===1&&budget.usage().dispatched<48)
 finalizationMetrics.networkRetention={deleted:8,calls:budget.usage().dispatched,oauthIncluded:true}
})

add('prepared main separates assets, refuses incomplete API configuration and keeps scheduling disabled',async()=>{
 let assets=0
 const env={CLIPZONE_ORIGIN:'https://preview.clipzone.example',ASSETS:{fetch:async()=>{assets++;return new Response('asset',{headers:{'Content-Type':'application/javascript'}})}}} as Parameters<typeof main.fetch>[1]
 check((await main.fetch(new Request(env.CLIPZONE_ORIGIN+'/asset.js'),env)).status===200&&assets===1)
 check((await main.fetch(new Request(env.CLIPZONE_ORIGIN+'/api/private'),env)).status===503&&assets===1)
 check((await main.scheduled({},env)).status==='disabled')
 const request=new Request(env.CLIPZONE_ORIGIN+'/images/games/missing.png')
 check((await main.fetch(request,env)).status===404)
})

add('300-source worst case remains bounded and next hourly run follows snapshot time, not delayed publication',async()=>{
 const d=memory(300);for(let n=100;n<300;n++)d.docs.get('shorts/s'+String(n).padStart(3,'0'))!.moderationStatus='removed'
 let result:Awaited<ReturnType<typeof stepRankingGeneration>>|undefined,steps=0
 while(result?.status!=='ready'){result=await stepRankingGeneration(d);steps++;check(steps<=30);d.advance()}
 check(result.itemCount===100&&result.examined===300)
 const current=d.docs.get('rankingState/current')!,computedAt=(current.computedAt as Date).getTime(),publishedAt=(current.publishedAt as Date).getTime()
 d.advance(computedAt+3600000-d.now().getTime())
 check(d.now().getTime()-publishedAt<3600000&&(await stepRankingGeneration(d)).status==='building')
 finalizationMetrics.worstSource={sourceDocuments:300,items:100,steps,snapshotAgeAtPublicationMs:publishedAt-computedAt}
})

add('full admin inbox and flagged comment windows fit REST budget without changing filtering or read state',async()=>{
 const seed=memory(),at=seed.now()
 for(let n=0;n<21;n++){
  const id=n.toString(16).padStart(64,'0')
  seed.docs.set('moderationLogs/e'+String(n).padStart(2,'0'),{notificationChannel:'updates',notificationKind:'reports',shortId:id,title:'Clip '+n,platform:'YouTube',createdAt:at,eventVersion:1,eligibleCount:15})
  seed.docs.set('shorts/'+id,{moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/28nFy4tGcwI'})
  seed.docs.set('reportSummaries/'+id,{status:'pending'})
  seed.docs.set('comments/'+id,{content:'Fixture '+n,shortId:id,moderationStatus:'pending',createdAt:at,reviewVersion:0})
  seed.docs.set('commentRequests/'+id,{flags:n%2?['spam']:['hate']})
 }
 const fixture=restFixture(seed.docs,seed.now)
 const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:fixture.fetcher}),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
 const inbox=await loadUpdates({category:'reports'},'fixture-admin',store);check(inbox.items.length===20&&!!inbox.next&&inbox.items.every(row=>!row.read))
 const inboxCalls=budget.usage().dispatched
 const comments=await loadCommentQueue({status:'pending',flag:'spam',sort:'date-desc'},store);check(comments.items.length===10&&comments.filteredWindow===true&&!!comments.next)
 check(budget.usage().dispatched<40)
 finalizationMetrics.adminWindows={events:20,inboxCalls,flaggedCommentCalls:budget.usage().dispatched-inboxCalls,authAndOAuthExcluded:true}
})
add('transaction batch read refuses after write and never falls back to unscoped batch',async()=>{
 const fixture=restFixture(new Map(),()=>new Date(1900000000000)),store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher:fixture.fetcher})
 await refuses(()=>store.transact(async tx=>{tx.set('games/fixture',{status:'active'});await tx.getMany!(['games/fixture'])}),/Reads must precede writes/)
 check(!fixture.docs.has('games/fixture'))
})
