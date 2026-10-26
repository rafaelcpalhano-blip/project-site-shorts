import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises'
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const lab=resolve(process.argv[2]??''),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'External approved lab required')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$|GOOGLE_APPLICATION_CREDENTIALS$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'finalization-')),config=join(run,'wrangler.json'),main=join(repo,'tests/runtime/worker-finalization-probe.ts')
await writeFile(config,JSON.stringify({name:'clipzone-local-finalization',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false},null,2))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{
 process.chdir(run);worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__local-proof'),result=await response.json()
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.passed.length,16);assert.equal(result.externalFetchAttempts,0)
 const artifact={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(join(lab,'node_modules/workerd/package.json'),'utf8')).version},result,limits:['Local runtime only; no billed edge CPU certification','Ephemeral generated keys and fake OAuth/REST/providers; no real credentials','No resources, scheduling, remote data, billing or deploy; readiness pending remote approval']}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/finalization-result.json'),JSON.stringify(artifact,null,2));console.log(JSON.stringify(artifact,null,2))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
