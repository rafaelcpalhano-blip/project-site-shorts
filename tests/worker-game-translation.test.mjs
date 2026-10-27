import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {createDescriptionTranslator,TRANSLATION_MODEL} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
function load(file,dependencies){
 const source=readFileSync(new URL('../server/runtime/'+file,import.meta.url),'utf8')
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,exports={}
 vm.runInNewContext(compiled,{exports,require:name=>dependencies(name),URL,Request,Response,WeakMap,Set,crypto,console})
 return exports
}
function application(translation){
 const config={origin:'https://clipzone.example.org',projectId:'clipzone-db02a',authProjectId:'clipzone-db02a',
  serviceEmail:'fixture',servicePrivateKey:'fixture',visitorSecret:'a'.repeat(64),networkSecret:'b'.repeat(64),
  authApiKey:'fixture',authAppId:'1:818748049569:web:'+'a'.repeat(24),adminUids:['fixture-uid'],
  twitchClientId:'fixture',twitchClientSecret:'fixture',youtubeApiKey:'fixture',...(translation?{translation}: {})}
 const rows=new Map([['games/igdb-1',{source:'IGDB',status:'active',officialName:'Portal',description:'Portal is a puzzle game.',aliases:[]}]])
 const store={transact:async work=>work({get:async path=>rows.get(path)??null,set:(path,value)=>rows.set(path,value)})}
 let entry,api,calls=0
 const fetcher=async(url,init)=>{
  calls++;assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+'a'.repeat(32)+'/ai/run/'+TRANSLATION_MODEL)
  assert.equal(init.headers.Authorization,'Bearer fixture-ai-token')
  const body=JSON.parse(init.body)
  const text=JSON.parse(body.messages[1].content).description.replace('is a puzzle game.','é um jogo de quebra-cabeça.')
  return Response.json({success:true,result:{response:text}})
 }
 const factory=load('cloudflare-application.ts',name=>{
  if(name.includes('translate-description'))return {createDescriptionTranslator}
  if(name.includes('translation-store'))return {createGameTranslation}
  if(name==='node:net')return {isIP:()=>0}
  if(name.includes('service-key'))return {createServiceKeySigner:()=>async()=>new Uint8Array(256)}
  if(name.includes('service-token'))return {createServiceTokenProvider:()=>()=>async()=>'fixture'}
  if(name.includes('firebase-admin'))return {createAdminAuthorizer:()=>async()=>false}
  if(name.includes('rest-store'))return {createRestStore:()=>store}
  if(name.includes('public-api'))return {createPublicApi:options=>{api=options;return async()=>Response.json({})}}
  if(name.includes('/igdb'))return {createIgdbCatalog:()=>({accessToken:async()=>'fixture'})}
  if(name.includes('/twitch'))return {createTwitchClipVerifier:()=>async()=>{}}
  if(name.includes('/configured'))return {createConfiguredVideoVerifier:()=>async()=>{}}
  if(name.includes('tiktok-availability'))return {createTikTokBackoff:()=>({})}
  if(name.includes('worker-entry'))return {createWorkerEntry:options=>{entry=options;return async()=>Response.json({})}}
  return {}
 }).createCloudflareApplication
 return {rows,config,calls:()=>calls,api:()=>api,create:async()=>{
  factory(config,{assets:async()=>Response.json({}),fetcher,now:()=>new Date('2026-10-27T12:00:00Z')})
  await entry.createApi({origin:config.origin,budget:{fetch:fetcher}})
 }}
}
test('Workers composition keeps translation absent by default without AI calls or tasks',async()=>{
 const f=application();await f.create();assert.equal(f.api().gameTranslation,undefined)
 assert.equal(f.calls(),0);assert.equal(f.rows.size,1)
})
test('opt-in Workers composition uses bounded request transport and persistent translation budget/cache',async()=>{
 const f=application({accountId:'a'.repeat(32),token:'fixture-ai-token'});await f.create()
 assert.equal(f.calls(),0)
 await f.api().gameTranslation('igdb-1');await f.api().gameTranslation('igdb-1')
 assert.equal(f.calls(),1)
 const game=f.rows.get('games/igdb-1')
 assert.equal(game.description,'Portal is a puzzle game.')
 assert.equal(game.translation.text,'Portal é um jogo de quebra-cabeça.')
 assert.equal(f.rows.get('translationUsage/2026-10-27').count,1)
})
test('invalid explicitly enabled translation fails configuration instead of using another provider or leaking key',async()=>{
 for(const translation of [{accountId:'wrong',token:'fixture-ai-token'},{accountId:'a'.repeat(32),token:''}]){
  const f=application(translation)
  await assert.rejects(f.create(),/^Error: worker-configuration-unavailable$/)
  assert.equal(f.calls(),0)
 }
})
test('Workers environment requires explicit true flag and passes only private translation configuration',async()=>{
 const seen=[]
 const entry=load('cloudflare-main.ts',name=>{
  if(name.includes('cloudflare-application'))return {createCloudflareApplication:config=>{seen.push(config);return async()=>Response.json({ok:true})}}
  if(name.includes('worker-api-headers'))return {workerApiHeaders:()=>({'Cache-Control':'no-store'})}
  return {}
 }).default
 const env={CLIPZONE_ORIGIN:'https://clipzone.example.org',CLIPZONE_ADMIN_UIDS:'fixture',
  CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_AI_TOKEN:'fixture-ai-token'}
 const request=new Request(env.CLIPZONE_ORIGIN+'/api/admin/config')
 await entry.fetch(request,env);assert.equal(seen[0].translation,undefined)
 env.CLIPZONE_TRANSLATION_ENABLED='true';await entry.fetch(request,env)
 assert.equal(seen[1].translation.token,'fixture-ai-token')
 env.CLOUDFLARE_AI_TOKEN='rotated-fixture';await entry.fetch(request,env)
 assert.equal(seen[2].translation.token,'rotated-fixture')
 assert.equal(seen[1].translation.token,'fixture-ai-token')
 env.CLIPZONE_TRANSLATION_ENABLED='false';await entry.fetch(request,env)
 assert.equal(seen[3].translation,undefined)
})
