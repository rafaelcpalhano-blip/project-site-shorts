import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createPrivateKey,createPublicKey,generateKeyPairSync,sign,X509Certificate} from 'node:crypto'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'

// Uses only previously approved local Wrangler and an already installed OpenSSL.
const lab=resolve(process.argv[2]??''),openssl=process.argv[3]
assert.ok(process.argv[2]&&openssl,'Supply isolated lab directory and installed OpenSSL executable')
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(isAbsolute(distance)||distance.startsWith('..'+sep),'Lab must be outside the repository')
const tool=JSON.parse(await readFile(resolve(lab,'node_modules/wrangler/package.json'),'utf8'))
assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'integration-')),assets=join(run,'assets')
await mkdir(join(assets,'assets'),{recursive:true});await mkdir(join(assets,'api'))
await writeFile(join(assets,'index.html'),'<!doctype html><title>Fixture</title>CLIPZONE TEST SPA')
await writeFile(join(assets,'assets/probe.js'),'globalThis.fixtureAsset = true;')
await writeFile(join(assets,'api/collision.txt'),'THIS ASSET MUST NOT SHADOW API')
const privatePath=join(run,'test-only-private.pem'),certificatePath=join(run,'test-only-certificate.pem')
execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','1','-subj','/CN=clipzone-test-only','-keyout',privatePath,'-out',certificatePath],{windowsHide:true,stdio:'pipe',timeout:20000})
const certificate=await readFile(certificatePath,'utf8'),privateKey=createPrivateKey(await readFile(privatePath,'utf8'))
assert.ok(new X509Certificate(certificate).publicKey.equals(createPublicKey(privateKey)))
const attacker=generateKeyPairSync('rsa',{modulusLength:2048}),time=1900000000
const base={sub:'owner',email:'owner@example.test',email_verified:true,aud:'clipzone-test',iss:'https://securetoken.google.com/clipzone-test',iat:time-10,exp:time+3500,auth_time:time-20,firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp',second_factor_identifier:'factor-1'}}
function token(patch={},key=privateKey){const content=[{alg:'RS256',kid:'key-1'},{...base,...patch}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');return content+'.'+sign('RSA-SHA256',Buffer.from(content),key).toString('base64url')}
const fixtures={certificate,valid:token(),forged:token({},attacker.privateKey),noTotp:token({firebase:{sign_in_provider:'google.com'}}),outsider:token({sub:'outsider'})}
const config=join(run,'wrangler.json'),main=resolve(repo,'tests/runtime/worker-integration-probe.ts')
await writeFile(config,JSON.stringify({name:'clipzone-local-integration-proof',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api','/api/*','/__integration-proof']}},null,2))
const {unstable_dev}=await import(pathToFileURL(resolve(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__integration-proof',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixtures)}),result=await response.json()
 console.log(JSON.stringify(result,null,2));assert.equal(response.status,200);assert.equal(result.passed.length,17)
 const routing=[],navigate={Accept:'text/html','Sec-Fetch-Mode':'navigate'}
 for(const path of ['/','/jogos/fixture']){const page=await worker.fetch(path,{headers:navigate});assert.equal(page.status,200);assert.match(await page.text(),/CLIPZONE TEST SPA/);routing.push('SPA '+path)}
 const script=await worker.fetch('/assets/probe.js');assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);assert.match(await script.text(),/fixtureAsset/);routing.push('real JS asset')
 for(const path of ['/api','/api/unknown','/api/collision.txt']){const page=await worker.fetch(path,{headers:navigate});assert.equal(page.status,404);assert.match(page.headers.get('content-type'),/application\/json/);assert.deepEqual(await page.json(),{error:'not-found'});routing.push('API bypasses SPA/assets '+path)}
 const admin=await worker.fetch('/api/admin/config');assert.equal(admin.status,503);assert.deepEqual(await admin.json(),{error:'admin-not-configured'});routing.push('unconfigured admin fails closed')
 const session=await worker.fetch('/api/session',{method:'POST',headers:{Origin:'https://clipzone.test','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10','X-Forwarded-For':'203.0.113.10'},body:'{}'});assert.equal(session.status,503);routing.push('spoofed IP cannot supply trusted context')
 const artifact={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(resolve(lab,'node_modules/workerd/package.json'),'utf8')).version},compatibilityDate:'2026-10-25',certificateFixture:'self-signed X509; synthetic identity only',runtime:result,routing,deployReady:false}
 await mkdir(resolve(lab,'evidence'),{recursive:true});await writeFile(resolve(lab,'evidence/integration-result.json'),JSON.stringify(artifact,null,2))
 console.log(JSON.stringify({runtimeChecks:result.passed.length,routingChecks:routing.length,deployReady:false}))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
