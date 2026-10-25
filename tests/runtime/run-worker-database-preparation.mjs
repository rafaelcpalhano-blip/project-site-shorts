import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const lab=resolve(process.argv[2]??''),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'External approved lab required')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'database-preparation-')),config=join(run,'wrangler.json'),main=join(repo,'tests/runtime/worker-database-preparation-probe.ts')
await writeFile(config,JSON.stringify({name:'clipzone-local-database-preparation',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false},null,2))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{process.chdir(run);worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__database-proof'),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.passed.length,9)
 const indexes=JSON.parse(await readFile(join(repo,'firestore/firestore.indexes.json'),'utf8')),seen=new Set();let duplicates=0
 for(const index of indexes.indexes){const key=JSON.stringify(index);if(seen.has(key))duplicates++;seen.add(key)}
 const artifact={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(join(lab,'node_modules/workerd/package.json'),'utf8')).version},result,indexInventory:{composite:indexes.indexes.length,fieldOverrides:indexes.fieldOverrides?.length??0,duplicateDefinitions:duplicates},limits:['fake OAuth exchange and generated ephemeral RSA keys only','no remote project/account/IAM inspection','preview metadata not applied; no content migration','real signer custody and Spark eligibility still need separate approval'],remoteReady:false}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/database-preparation-result.json'),JSON.stringify(artifact,null,2));console.log(JSON.stringify(artifact,null,2))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
