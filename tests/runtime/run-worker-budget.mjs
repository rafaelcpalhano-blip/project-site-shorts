import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
assert.ok(process.argv[2],'Supply the previously approved isolated runtime lab')
const lab=resolve(process.argv[2]),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(isAbsolute(distance)||distance.startsWith('..'+sep),'Lab must stay outside the repository')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'budget-')),config=join(run,'wrangler.json'),main=join(repo,'tests/runtime/worker-budget-probe.ts')
await writeFile(config,JSON.stringify({name:'clipzone-local-budget-proof',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false},null,2))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__budget-proof'),result=await response.json()
 const artifact={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(join(lab,'node_modules/workerd/package.json'),'utf8')).version},compatibilityDate:'2026-10-25',result}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/budget-result.json'),JSON.stringify(artifact,null,2))
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.scenarios.length,6);assert.equal(result.deployReady,false)
 console.log(JSON.stringify({scenarios:result.scenarios.map(({name,status,usage,committedQuota})=>({name,status,usage,committedQuota})),parallel:result.parallel,deployReady:false},null,2))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
