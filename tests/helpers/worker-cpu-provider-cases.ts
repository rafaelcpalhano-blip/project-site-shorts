import {createCloudflareApplication} from '../../server/runtime/cloudflare-application.ts'
import workerMain from '../../server/runtime/cloudflare-main.ts'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {restFixture} from './portable-rest-fixture.ts'
import {importHmacKey} from '../../server/security/hmac-key.ts'
import {createVisitorIdentity} from '../../server/security/visitor-identity.ts'
import {createRankingCursor} from '../../server/ranking/cursor.ts'
import {createNetworkProtection} from '../../server/security/network-abuse.ts'
import {createTikTokVerifier} from '../../server/videos/tiktok.ts'
import {createWorkerFetch} from '../../server/runtime/worker-fetch.ts'
import type {TikTokDiagnostic} from '../../server/videos/tiktok.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
const check=(ok:unknown)=>{if(!ok)throw Error('cpu-provider-regression')}
async function refuses(work:()=>unknown){try{await work()}catch{return}throw Error('expected-refusal')}
const secret=(n:number)=>n.toString(16).padStart(2,'0').repeat(32)
export const cpuProviderCases:Array<{name:string;run:()=>Promise<void>}>=[]
const add=(name:string,run:()=>Promise<void>)=>cpuProviderCases.push({name,run})
add('HMAC keys are non-extractable, usage-scoped and reused without sharing signatures or identity decisions',async()=>{
 const one=await importHmacKey(secret(181),'sign-verify'),two=await importHmacKey(secret(181).toUpperCase(),'sign-verify'),sign=await importHmacKey(secret(181),'sign')
 check(one===two&&one!==sign&&!one.extractable&&!sign.extractable&&sign.usages.join(',')==='sign')
 await refuses(()=>importHmacKey('bad','sign'));await refuses(()=>crypto.subtle.exportKey('raw',one))
})
add('key rotation and bounded eviction preserve signatures and never accept another secret',async()=>{
 const bytes=new TextEncoder().encode('fixture-domain:payload'),old=await importHmacKey(secret(182),'sign-verify'),signature=await crypto.subtle.sign('HMAC',old,bytes)
 for(let n=190;n<200;n++)await importHmacKey(secret(n),'sign-verify')
 const restored=await importHmacKey(secret(182),'sign-verify'),rotated=await importHmacKey(secret(183),'sign-verify')
 check(restored!==old&&await crypto.subtle.verify('HMAC',restored,signature,bytes)&&!await crypto.subtle.verify('HMAC',rotated,signature,bytes))
})
add('failed key imports are retried instead of poisoning later requests',async()=>{
 const original=crypto.subtle.importKey.bind(crypto.subtle);let calls=0
 crypto.subtle.importKey=((...args:Parameters<SubtleCrypto['importKey']>)=>{calls++;return calls===1?Promise.reject(Error('fixture-only')):original(...args)}) as SubtleCrypto['importKey']
 try{await refuses(()=>importHmacKey(secret(184),'sign'));check((await importHmacKey(secret(184),'sign')).algorithm.name==='HMAC'&&calls===2)}finally{crypto.subtle.importKey=original}
})
add('recreated identity and cursor factories still reject tampering, expired cookies, rotated keys and cross-purpose tokens',async()=>{
 let clock=1900000000000;const at=()=>new Date(clock),a=await createVisitorIdentity(secret(185),at),b=await createVisitorIdentity(secret(185),at),other=await createVisitorIdentity(secret(186),at)
 const raw=(await a.issue()).split(';')[0],request=()=>new Request('https://clipzone.example',{headers:{Cookie:raw}}),id=await a.resolveVisitor(request())
 check(id===await b.resolveVisitor(request())&&id!==null&&await other.resolveVisitor(request())===null)
 const tampered=raw.slice(0,-1)+(raw.endsWith('0')?'1':'0');check(await b.resolveVisitor(new Request('https://clipzone.example',{headers:{Cookie:tampered}}))===null)
 const cursor=await createRankingCursor(secret(185),'https://clipzone.example');await refuses(()=>cursor.open(raw.slice(raw.indexOf('=')+1)))
 clock+=30*86400000;check(await b.resolveVisitor(request())===null)
})
add('persistent network session limits remain enforced across recreated factories sharing a key',async()=>{
 const docs=new Map<string,RecordData>(),store={transact:async(work:Parameters<AtomicStore['transact']>[0])=>work({get:async p=>docs.get(p)??null,set:(p,d)=>{docs.set(p,d)},create:()=>{throw Error('unexpected')},delete:()=>{throw Error('unexpected')}})} as AtomicStore
 const opts={secret:secret(187),store,now:()=>new Date('2026-10-26T12:00:00Z')}
 for(let n=0;n<8;n++)await(await createNetworkProtection(opts)).attempt('8.8.8.8','sessions')
 await refuses(async()=> (await createNetworkProtection(opts)).attempt('8.8.8.8','sessions'));check(docs.size===1&&[...docs.values()][0].total===8)
})
const video='https://www.tiktok.com/@fixture/video/6718335390845095173'
const valid={type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'6718335390845095173'}
add('TikTok diagnostic events contain only status and shape booleans; optional missing text remains supported',async()=>{
 const events:TikTokDiagnostic[]=[];const verify=createTikTokVerifier(async()=>Response.json(valid),event=>events.push(event));const evidence=await verify({url:video})
 check(evidence.existence==='confirmed'&&evidence.title===undefined&&evidence.channelName===undefined&&events.length===2&&events[0].status===200&&events[1].identityMatches===true)
 check(!JSON.stringify(events).includes('fixture')&&!JSON.stringify(events).includes('6718335'))
 const throwing=createTikTokVerifier(async()=>Response.json(valid),()=>{throw Error('observer-unavailable')});check((await throwing({url:video})).existence==='confirmed')
})
add('TikTok HTTP errors and mismatched identities stay unconfirmed with diagnostic mode enabled',async()=>{
 for(const response of [()=>new Response('private provider body',{status:403}),()=>Response.json({...valid,embed_product_id:'different'}),()=>Response.json({...valid,provider_name:'Other'})]){
 const events:TikTokDiagnostic[]=[];check((await createTikTokVerifier(async()=>response(),event=>events.push(event))({url:video})).existence==='unknown');check(!JSON.stringify(events).includes('private provider body'))
 }
})
add('TikTok diagnostics classify rejected redirects without following them or exposing targets',async()=>{
 let calls=0;const events:TikTokDiagnostic[]=[];const transport=createWorkerFetch(async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://private-target.invalid/secret'}})})
 const result=await createTikTokVerifier(transport,event=>events.push(event))({url:video});check(result.existence==='unknown'&&calls===1&&events[0].reason==='transport-error'&&!JSON.stringify(events).includes('private-target'))
})

add('lazy REST transactions join concurrent first reads and save one request without losing the transaction',async()=>{
 const fixture=restFixture(new Map([['games/a',{value:1}],['games/b',{value:2}]]),()=>new Date(1900000000000)),bodies:Array<Record<string,unknown>>=[]
 const fetcher:typeof fetch=async(input,init)=>{bodies.push({operation:String(input).split(':').at(-1),...JSON.parse(String(init?.body))});return fixture.fetcher(input,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture',fetcher,lazyTransactions:true})
 await store.transact(async tx=>{const [a,b]=await Promise.all([tx.get('games/a'),tx.get('games/b')]);check(a?.value===1&&b?.value===2);tx.set('games/c',{value:3})})
 check(bodies.length===3&&bodies.filter(b=>b.newTransaction).length===1&&!bodies.some(b=>b.operation==='beginTransaction')&&fixture.docs.get('games/c')?.value===3)
 check(typeof bodies[1].transaction==='string'&&bodies[1].transaction===bodies[2].transaction)
})
add('lazy transaction retries ABORTED using its previous ID and never drops create-only preconditions',async()=>{
 const fixture=restFixture(new Map(),()=>new Date(1900000000000));let fail=true;const bodies:Array<Record<string,unknown>>=[]
 const fetcher:typeof fetch=async(input,init)=>{const body=JSON.parse(String(init?.body));bodies.push({operation:String(input).split(':').at(-1),...body});if(String(input).endsWith(':commit')&&fail){fail=false;return Response.json({error:{status:'ABORTED'}},{status:409})}return fixture.fetcher(input,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture',fetcher,lazyTransactions:true})
 await store.transact(async tx=>{check(await tx.get('games/new')===null);tx.create('games/new',{value:1})})
 const starts=bodies.filter(b=>b.newTransaction),commits=bodies.filter(b=>b.operation==='commit')
 check(starts.length===2&&commits.length===2&&((starts[1].newTransaction as {readWrite:{retryTransaction:string}}).readWrite.retryTransaction===commits[0].transaction)&&fixture.docs.get('games/new')?.value===1)
 await refuses(()=>store.transact(async tx=>{await tx.get('games/new');tx.create('games/new',{value:2})}));check(fixture.docs.get('games/new')?.value===1)
})
add('lazy transaction rejects malformed startup or incomplete reads and preserves write-before-read refusal',async()=>{
 for(const reply of [[{missing:'projects/clipzone-db02a/databases/(default)/documents/games/a'}],[{transaction:'fixture'}, {missing:'projects/clipzone-db02a/databases/(default)/documents/games/wrong'}]]){
 let commits=0;const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture',lazyTransactions:true,fetcher:async(input)=>{if(String(input).endsWith(':commit'))commits++;return Response.json(reply)}})
 await refuses(()=>store.transact(async tx=>{await tx.get('games/a');tx.set('games/a',{bad:true})}));check(commits===0)
 }
 let calls=0;const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture',lazyTransactions:true,fetcher:async()=>{calls++;throw Error('unexpected')}})
 await refuses(()=>store.transact(async tx=>{tx.set('games/a',{bad:true});await tx.get('games/a')}));check(calls===0)
})
add('lazy create-only transactions and first-query transactions retain explicit begin fallback',async()=>{
 const fixture=restFixture(new Map(),()=>new Date(1900000000000)),operations:string[]=[];const fetcher:typeof fetch=async(input,init)=>{operations.push(String(input).split(':').at(-1)!);return fixture.fetcher(input,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture',fetcher,lazyTransactions:true})
 await store.transact(async tx=>{tx.create('games/a',{value:1})});check(operations.join(',')==='beginTransaction,commit')
 operations.length=0;await store.transact(async tx=>{check(await tx.hasPublishedComment!('fixture-short')===false)});check(operations.join(',')==='beginTransaction,runQuery,commit')
})

add('opt-in homologation observations distinguish application and route initialization without exposing private request data',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'
 const env={ASSETS:{fetch:async()=>new Response('asset')},CLIPZONE_ORIGIN:'https://preview.clipzone.example',FIREBASE_PROJECT_ID:'clipzone-db02a',FIREBASE_AUTH_PROJECT_ID:'clipzone-db02a',FIREBASE_SERVICE_EMAIL:'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',FIREBASE_SERVICE_PRIVATE_KEY:pem,CLIPZONE_VISITOR_SECRET:secret(221),CLIPZONE_NETWORK_SECRET:secret(222),FIREBASE_AUTH_API_KEY:'fixture-public',FIREBASE_AUTH_APP_ID:'1:818748049569:web:c73f2f86ab6e589f6a88e0',CLIPZONE_ADMIN_UIDS:'fixture-private-uid',TWITCH_CLIENT_ID:'fixture-client',TWITCH_CLIENT_SECRET:'fixture-private-secret',YOUTUBE_API_KEY:'fixture-private-youtube',CLIPZONE_HOMOLOGATION_OBSERVABILITY:'true'}
 const log=console.info,events:Array<Record<string,unknown>>=[];console.info=(...args:unknown[])=>{if(args[0]==='clipzone-homologation')events.push(JSON.parse(String(args[1])))}
 const request=()=>{const r=new Request(env.CLIPZONE_ORIGIN+'/api/admin/config',{headers:{'CF-Connecting-IP':'8.8.8.8','Cookie':'private-cookie','Authorization':'Bearer private-token'}});Object.defineProperty(r,'cf',{value:{colo:'GRU',httpProtocol:'HTTP/2'}});return r}
 try{
  for(let n=0;n<2;n++){const r=await workerMain.fetch(request(),env);check(r.status===200&&!r.headers.has('x-clipzone-isolate'));await r.body?.cancel()}
  check(events.length===2&&events[0].applicationCreated===true&&events[1].applicationCreated===false&&events[0].firstRouteInIsolate===true&&events[1].firstRouteInIsolate===false&&events[0].isolate===events[1].isolate)
  const privateRequest=new Request(env.CLIPZONE_ORIGIN+'/api/private-user-id?token=private-value',{headers:{'CF-Connecting-IP':'8.8.8.8'}});Object.defineProperty(privateRequest,'cf',{value:{colo:'GRU',httpProtocol:'HTTP/2'}});check((await workerMain.fetch(privateRequest,env)).status===404&&events[2].route==='other')
  const encoded=JSON.stringify(events);for(const sensitive of ['private-user-id','private-value','private-cookie','private-token','8.8.8.8','fixture-private',pem])check(!encoded.includes(sensitive))
  console.info=()=>{throw Error('logger-unavailable')};check((await workerMain.fetch(request(),env)).status===200)
  env.CLIPZONE_HOMOLOGATION_OBSERVABILITY='false';check((await workerMain.fetch(request(),env)).status===200&&events.length===3)
 }finally{console.info=log}
})
add('homologation observation route values are fixed and never record arbitrary URL paths or queries',async()=>{
 // Application setup below is deliberately invalid; default failure never reflects a private URL.
 const result=await workerMain.fetch(new Request('https://preview.clipzone.example/api/private-user-id?token=private-value'),{} as Parameters<typeof workerMain.fetch>[1]);const text=await result.text();check(result.status===503&&!text.includes('private-user-id')&&!text.includes('private-value'))
})

add('Workers URL preview does not touch TikTok backoff; submission respects actual video 429 without publishing unverified content',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify'])
 const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'
 let upstream=0;const now=()=>new Date(1900000000000),fixture=restFixture(new Map(),now),origin='https://preview.clipzone.example'
 const fetcher:typeof fetch=async(input,init)=>{
  if(new URL(String(input)).origin==='https://www.tiktok.com'){upstream++;return new Response(null,{status:429,headers:{'Retry-After':'120'}})}
  return fixture.fetcher(input,init)
 }
 const app=createCloudflareApplication({origin,projectId:'clipzone-db02a',authProjectId:'clipzone-db02a',serviceEmail:'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',servicePrivateKey:pem,visitorSecret:secret(231),networkSecret:secret(232),authApiKey:'fixture-public',authAppId:'1:818748049569:web:c73f2f86ab6e589f6a88e0',adminUids:['fixture-admin'],twitchClientId:'fixture',twitchClientSecret:'fixture',youtubeApiKey:'fixture'},{assets:async()=>new Response('asset'),fetcher,now})
 let cookie=''
 const post=async(path:string,body:unknown)=>{
  const request=new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'8.8.8.8',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)})
  Object.defineProperty(request,'cf',{value:{colo:'GRU',httpProtocol:'HTTP/2'}})
  const response=await app(request);cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie;return response
 }
 check((await post('/api/session',{})).status===204)
 const url='https://www.tiktok.com/@fixture/video/123456789'
 const preview=await post('/api/shorts/preview',{url});check(preview.status===200&&(await preview.json() as {channelName:string}).channelName==='@fixture'&&upstream===0)
 const submission=await post('/api/shorts',{url,gameId:'fixture',title:'Fixture title',channelName:'Fixture'})
 check(submission.status===503&&submission.headers.get('retry-after')==='120'&&(await submission.json() as {error:string}).error==='source-rate-limited'&&upstream===1)
 const second=await post('/api/shorts',{url,gameId:'fixture',title:'Fixture title',channelName:'@fixture'});check(second.status===503&&upstream===1)
 check((await post('/api/shorts/preview',{url})).status===200&&upstream===1)
 check(![...fixture.docs.keys()].some(path=>/^(shorts|videoIdentities|submissionLimits|submissionOwners|moderationLogs)\//.test(path)))
})

add('automatic full and short TikTok URLs share canonical identity and publish with exactly one fresh video lookup in Workers',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify'])
 const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'
 const now=()=>new Date(1900000000000),fixture=restFixture(new Map([['games/fixture',{status:'active',officialName:'Fixture game'}]]),now),origin='https://preview.clipzone.example',upstream:string[]=[]
 const fetcher:typeof fetch=async(input,init)=>{
  const target=new URL(String(input))
  if(target.origin==='https://vt.tiktok.com')return new Response(null,{status:302,headers:{Location:'https://www.tiktok.com/@fixture/video/123456789?tracking=x'}})
  if(target.origin==='https://www.tiktok.com'){
   const headers=new Headers(init?.headers);check(headers.get('accept')==='application/json'&&headers.get('user-agent')==='Clipzone/1.0 (+https://www.clipzone.workers.dev)');check(init?.cache==='no-store')
   const subject=target.searchParams.get('url')!;upstream.push(subject)
   check(subject.includes('/video/'));return Response.json({type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'123456789'})
  }
  return fixture.fetcher(input,init)
 }
 const app=createCloudflareApplication({origin,projectId:'clipzone-db02a',authProjectId:'clipzone-db02a',serviceEmail:'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',servicePrivateKey:pem,visitorSecret:secret(233),networkSecret:secret(234),authApiKey:'fixture-public',authAppId:'1:818748049569:web:c73f2f86ab6e589f6a88e0',adminUids:['fixture-admin'],twitchClientId:'fixture',twitchClientSecret:'fixture',youtubeApiKey:'fixture'},{assets:async()=>new Response('asset'),fetcher,now})
 let cookie=''
 const post=async(path:string,body:unknown)=>{const request=new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'8.8.8.8',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});Object.defineProperty(request,'cf',{value:{colo:'GRU',httpProtocol:'HTTP/2'}});const r=await app(request);cookie=r.headers.get('set-cookie')?.split(';')[0]??cookie;return r}
 check((await post('/api/session',{})).status===204)
 const url='https://www.tiktok.com/@fixture/video/123456789'
 const short='https://vt.tiktok.com/Fixture/'
 const resolved=await post('/api/shorts/resolve',{url:short});check(resolved.status===200&&(await resolved.json() as {url:string}).url===url)
 for(const input of [url,short]){const preview=await post('/api/shorts/preview',{url:input}),metadata=await preview.json() as {title:null;channelName:string};check(preview.status===200&&metadata.title===null&&metadata.channelName==='@fixture')}
 check(upstream.length===0&&![...fixture.docs.keys()].some(key=>key.startsWith('shorts/')))
 const negative=await post('/api/shorts',{url,gameId:'missing-preflight-proof',title:'Fixture title',channelName:'@fixture'});check(negative.status===422&&(await negative.json() as {error:string}).error==='invalid-game'&&upstream.length===1&&!([...fixture.docs.keys()].some(key=>/^(shorts|videoIdentities|submissionLimits|submissionOwners|moderationLogs)\//.test(key))))
 const response=await post('/api/shorts',{url,gameId:'fixture',title:'Fixture title',channelName:'Fixture creator'}),result=await response.json() as {status:string;remaining:number;id:string}
 check(response.status===201&&result.status==='published'&&result.remaining===4&&upstream.length===2&&upstream.every(value=>value===url))
 check(fixture.docs.get('shorts/'+result.id)?.moderationStatus==='published'&&[...fixture.docs.keys()].filter(key=>key.startsWith('shorts/')).length===1)
})
