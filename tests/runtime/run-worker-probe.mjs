import assert from 'node:assert/strict'
import {generateKeyPairSync,sign} from 'node:crypto'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'

// Run with: node tests/runtime/run-worker-probe.mjs <absolute isolated lab directory>
// This script never installs tools, reads project .env files, logs in, or deploys.
assert.ok(process.argv[2],'Supply the separately approved runtime lab directory')
const lab=resolve(process.argv[2]),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const labRelative=relative(repo,lab)
assert.ok(isAbsolute(labRelative)||labRelative.startsWith('..'+sep),'Runtime tools/config must remain outside the application repository')
const tool=JSON.parse(await readFile(resolve(lab,'node_modules/wrangler/package.json'),'utf8'))
assert.equal(tool.version,'4.152.0','Revalidate proof before changing the pinned runtime tool')
process.env.WRANGLER_SEND_METRICS='false'
process.env.CLOUDFLARE_SEND_METRICS='false'
process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const main=resolve(repo,'tests/runtime/worker-probe.ts'),config=resolve(lab,'wrangler.probe.json')
await writeFile(config,JSON.stringify({name:'clipzone-local-runtime-proof',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false},null,2))
const keys=generateKeyPairSync('rsa',{modulusLength:2048}),attacker=generateKeyPairSync('rsa',{modulusLength:2048}),time=1900000000
const base={sub:'owner',email:'owner@example.test',email_verified:true,aud:'clipzone-test',iss:'https://securetoken.google.com/clipzone-test',iat:time-10,exp:time+3500,auth_time:time-20,firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp',second_factor_identifier:'factor-1'}}
function token(patch={},privateKey=keys.privateKey){
 const content=[{alg:'RS256',kid:'key-1'},{...base,...patch}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
 return content+'.'+sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64url')
}
const fixtures={publicPem:keys.publicKey.export({format:'pem',type:'spki'}),valid:token(),forged:token({},attacker.privateKey),noTotp:token({firebase:{sign_in_provider:'google.com'}}),outsider:token({sub:'outsider'})}
const {unstable_dev}=await import(pathToFileURL(resolve(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd()
let worker
try{
 process.chdir(lab)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__runtime-proof',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixtures)})
 const result=await response.json()
 console.log(JSON.stringify(result,null,2))
 const versions={wrangler:tool.version,workerd:JSON.parse(await readFile(resolve(lab,'node_modules/workerd/package.json'),'utf8')).version}
 await mkdir(resolve(lab,'evidence'),{recursive:true})
 await writeFile(resolve(lab,'evidence/runtime-result.json'),JSON.stringify({created:new Date().toISOString(),versions,compatibilityDate:'2026-10-25',result},null,2))
 assert.equal(response.status,200,'All runtime proof checks must complete successfully')
 assert.equal(result.passed.length,14)
 assert.equal(result.deployReady,false,'A green probe must never claim deployment readiness')
}finally{
 try{if(worker)await worker.stop()}finally{process.chdir(prior)}
}
