import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp} from 'node:fs/promises'
import {resolve,join,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {spawnSync} from 'node:child_process'
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),lab=resolve(process.argv[2]??'')
assert.ok(process.argv[2]&&!lab.startsWith(repo),'Approved external lab required')
assert.equal(JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8')).version,'4.152.0')
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$|GOOGLE_APPLICATION_CREDENTIALS$)/.test(key))delete process.env[key]
Object.assign(process.env,{WRANGLER_SEND_METRICS:'false',CLOUDFLARE_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',WRANGLER_WRITE_LOGS:'false',CI:'true'})
const run=await mkdtemp(join(lab,'pwa-local-')),assets=join(run,'dist'),main=join(run,'worker.mjs'),config=join(run,'wrangler.json')
const build=spawnSync(process.execPath,[join(repo,'node_modules/vite/bin/vite.js'),'build','--outDir',assets],{cwd:repo,env:{...process.env,VITE_DATA_MODE:'api'},windowsHide:true,encoding:'utf8',timeout:120000})
assert.equal(build.status,0,'Local isolated build failed: '+build.stderr)
await writeFile(main,`export default{fetch(){return Response.json({fixture:true},{headers:{'Cache-Control':'no-store'}})}}`)
await writeFile(config,JSON.stringify({name:'clipzone-pwa-local',main,compatibility_date:'2026-10-25',workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api','/api/*']}}))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const before=process.cwd(),checks=[];let worker
try{
 process.chdir(run);worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:19383,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 for(const path of ['/manifest.webmanifest','/icons/clipper-gamer-192.png','/icons/clipper-gamer-512.png','/icons/clipper-gamer-maskable-512.png','/icons/clipper-gamer-180.png','/icons/clipper-gamer-64.webp','/games/fixture','/admin','/api/fixture']){
  const response=await worker.fetch(path),type=response.headers.get('content-type'),cache=response.headers.get('cache-control')??''
  assert.equal(response.status,200)
  if(path==='/manifest.webmanifest'){assert.ok(type.startsWith('application/manifest+json'));assert.equal((await response.json()).display,'standalone')}
  else if(path.startsWith('/icons/'))assert.ok(type.startsWith(path.endsWith('.webp')?'image/webp':'image/png'))
  else if(path.startsWith('/api/')){assert.equal(cache,'no-store');assert.equal((await response.json()).fixture,true)}
  else{assert.ok(type.startsWith('text/html'));assert.ok((await response.text()).includes('rel="manifest"'))}
  assert.equal(cache.includes('immutable'),false);checks.push({path,type,cache,passed:true})
 }
 const report={at:new Date().toISOString(),localOnly:true,buildPassed:true,buildDirectory:assets,workerUsesFixtureApi:true,checks,passed:checks.length,remoteAccess:false,deploy:false}
 await writeFile(join(lab,'evidence/pwa-assets-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(before)}}
