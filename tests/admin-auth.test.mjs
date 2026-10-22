import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createAdminAuthorizer } from '../server/auth/firebase-admin.ts'
import { handleAdmin } from '../server/http/admin.ts'
const projectId='clipzone-test', uid='owner', time=1900000000
const keys=generateKeyPairSync('rsa',{modulusLength:2048})
const publicPem=keys.publicKey.export({format:'pem',type:'spki'})
const base={sub:uid,email:'owner@example.test',email_verified:true,aud:projectId,iss:'https://securetoken.google.com/'+projectId,iat:time-10,exp:time+3500,auth_time:time-20,firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp',second_factor_identifier:'factor-1'}}
function token(patch={},header={alg:'RS256',kid:'key-1'},privateKey=keys.privateKey){
 const content=[header,{...base,...patch}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
 return content+'.'+sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64url')
}
const user={localId:uid,email:base.email,emailVerified:true,validSince:String(time-100),mfaInfo:[{mfaEnrollmentId:'factor-1',totpInfo:{}}]}
function setup(patch={}){
 let account=user, certificateRequests=0, lookups=0
 const authorize=createAdminAuthorizer({projectId,apiKey:'test-key',allowedUids:[uid],now:()=>new Date(time*1000),fetcher:async(url,options)=>{
  assert.equal(options.redirect,'error');assert.ok(options.signal)
  if(String(url).includes('/metadata/x509/')){certificateRequests++;return Response.json({'key-1':publicPem},{headers:{'Cache-Control':'public, max-age=3600'}})}
  assert.equal(String(url),'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key')
  assert.ok(JSON.parse(options.body).idToken)
  lookups++;return Response.json({users:[account]})
 },...patch})
 return {authorize,account:value=>{account=value},counts:()=>({certificateRequests,lookups})}
}
const request=value=>new Request('https://clipzone.test/api/admin/session',{method:'POST',headers:{Origin:'https://clipzone.test',Authorization:'Bearer '+value}})
test('valid signature, allowlisted UID and actual TOTP plus current account are required',async()=>{
 const check=setup()
 assert.deepEqual(await check.authorize(request(token())),{uid,email:base.email})
 assert.deepEqual(await check.authorize(request(token())),{uid,email:base.email})
 assert.deepEqual(check.counts(),{certificateRequests:1,lookups:2})
})
test('forged signatures, algorithms, audience, issuer, timestamps and email are denied',async()=>{
 const check=setup()
 for(const patch of [{aud:'another-project'},{iss:'https://evil.test'},{exp:time},{iat:time+1},{auth_time:time+1},{sub:''},{email_verified:false}]){
  await assert.rejects(check.authorize(request(token(patch))))
 }
 await assert.rejects(check.authorize(request(token({}, {alg:'none',kid:'key-1'}))))
 await assert.rejects(check.authorize(request(token({}, {alg:'HS256',kid:'key-1'}))))
 await assert.rejects(check.authorize(request(token({}, {alg:'RS256',kid:'unknown'}))))
 const attacker=generateKeyPairSync('rsa',{modulusLength:2048})
 await assert.rejects(check.authorize(request(token({},undefined,attacker.privateKey))))
 await assert.rejects(check.authorize(request('not.a.token')))
 assert.equal(check.counts().lookups,0)
})
test('non-admin, no second factor, SMS factor and tenant tokens never reach privileged operation',async()=>{
 const check=setup()
 for(const [patch,code] of [[{sub:'visitor'},'admin-forbidden'],[{firebase:{sign_in_provider:'google.com'}},'totp-required'],[{firebase:{sign_in_provider:'google.com',sign_in_second_factor:'phone',second_factor_identifier:'factor-1'}},'totp-required'],[{firebase:{...base.firebase,tenant:'tenant-1'}},'admin-forbidden']]){
  await assert.rejects(check.authorize(request(token(patch))),{message:code})
 }
 assert.equal(check.counts().lookups,0)
})
test('disabled, revoked, removed factor and mismatched current account fail closed',async()=>{
 const check=setup()
 for(const patch of [{disabled:true},{validSince:String(time-5)},{mfaInfo:[]},{mfaInfo:[{mfaEnrollmentId:'other',totpInfo:{}}]},{localId:'other'},{emailVerified:false},{email:'changed@example.test'},{validSince:'invalid'}]){
  check.account({...user,...patch})
  await assert.rejects(check.authorize(request(token())))
 }
})
test('missing allowlist, upstream failure and unavailable state never grant access',async()=>{
 await assert.rejects(setup({allowedUids:[]}).authorize(request(token())),{message:'admin-not-configured'})
 await assert.rejects(setup({fetcher:async()=>{throw new Error('private credential')}}).authorize(request(token())),{message:'auth-unavailable'})
})
test('HTTP rejects foreign origin, missing configuration and admission; never returns secrets',async()=>{
 const config={publicConfig:{apiKey:'public-key',projectId,authDomain:'clipzone-test.firebaseapp.com',appId:'app'},authorize:setup().authorize}
 assert.equal((await handleAdmin(request(token()),'https://clipzone.test')).status,503)
 assert.equal((await handleAdmin(request(token()),'https://other.test',config)).status,403)
 assert.equal((await handleAdmin(request(token()),'https://clipzone.test',config)).status,429)
 const response=await handleAdmin(request(token()),'https://clipzone.test',config,async()=>true)
 assert.equal(response.status,200); assert.equal(response.headers.get('Cache-Control'),'no-store')
 assert.deepEqual(await response.json(),{authenticated:true,uid,email:base.email})
 const failure=await handleAdmin(request(token()),'https://clipzone.test',{...config,authorize:async()=>{throw new Error('secret')}},async()=>true)
 assert.equal((await failure.text()).includes('secret'),false)
})


test('todas as APIs administrativas recusam chamadas diretas sem token, outro UID ou MFA ausente antes de ler dados privados',async()=>{
 const {createPublicApi}=await import('../server/http/public-api.ts')
 const records=new Map(),authorize=setup().authorize,origin='https://clipzone.test'
 const store={transact:async work=>work({get:async path=>{assert.match(path,/^adminAuthAttempts\//);return records.get(path)??null},set:(path,data)=>{assert.match(path,/^adminAuthAttempts\//);records.set(path,data)},create:()=>assert.fail('Nenhuma operação privilegiada permitida')})}
 const api=await createPublicApi({origin,store,now:()=>new Date(time*1000),visitorSecret:'ab'.repeat(32),maximumAttempts:200,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>assert.fail('Não verificar vídeo sem autorização'),admin:{publicConfig:{},authorize}})
 const post=(path,authorization,cookie='')=>api(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...(authorization?{Authorization:authorization}:{})},body:'{}'}))
 const session=await post('/api/session'),cookie=session.headers.get('set-cookie').split(';')[0]
 const paths=['/api/admin/session','/api/admin/games/catalog','/api/admin/games/detail','/api/admin/games/moderate','/api/admin/games/queue','/api/admin/games/review','/api/admin/queue','/api/admin/detail','/api/admin/review','/api/admin/comments/queue','/api/admin/comments/detail','/api/admin/comments/review']
 for(const path of paths)for(const authorization of [undefined,'Bearer invalid','Bearer '+token({sub:'other-user'}),'Bearer '+token({firebase:{sign_in_provider:'google.com'}})]){
  const response=await post(path,authorization,cookie);assert.ok([401,403].includes(response.status),path+' '+response.status)
  const data=await response.json();assert.ok(!data.items&&!data.logs&&!data.uid)
 }
})
