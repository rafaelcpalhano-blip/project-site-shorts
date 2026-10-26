import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const lab=resolve(process.argv[2]??''),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'Approved external lab required')
assert.equal(JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8')).version,'4.152.0')
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$|GOOGLE_APPLICATION_CREDENTIALS$)/.test(key))delete process.env[key]
Object.assign(process.env,{WRANGLER_SEND_METRICS:'false',CLOUDFLARE_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',WRANGLER_WRITE_LOGS:'false',CI:'true'})
const run=await mkdtemp(join(lab,'api-headers-')),main=join(repo,'tests/runtime/worker-api-header-probe.ts'),config=join(run,'wrangler.json')
await writeFile(config,JSON.stringify({name:'clipzone-api-headers-local',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false}))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:19384,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/local-proof'),result=await response.json();assert.equal(response.status,200);assert.equal(result.passed.length,20)
 const report={at:new Date().toISOString(),runtime:'workerd',wrangler:'4.152.0',localOnly:true,passed:result.passed,caseCount:20,cpuMeasured:false,remoteServicesConfigured:false,credentialAccess:false,newDependencies:false,deployment:false}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/api-headers-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
