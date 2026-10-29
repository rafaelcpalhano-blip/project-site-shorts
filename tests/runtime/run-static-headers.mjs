import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,mkdir,copyFile} from 'node:fs/promises'
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),lab=resolve(process.argv[2]??''),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'External approved lab required')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$|GOOGLE_APPLICATION_CREDENTIALS$)/.test(key))delete process.env[key]
Object.assign(process.env,{WRANGLER_SEND_METRICS:'false',CLOUDFLARE_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',WRANGLER_WRITE_LOGS:'false',CI:'true'})
const run=await mkdtemp(join(lab,'static-headers-')),assets=join(run,'public'),main=join(run,'worker.mjs'),config=join(run,'wrangler.json')
await mkdir(join(assets,'assets'),{recursive:true});await mkdir(join(assets,'clipper'))
await copyFile(join(repo,'public/_headers'),join(assets,'_headers'))
await copyFile(join(repo,'public/robots.txt'),join(assets,'robots.txt'))
await writeFile(join(assets,'index.html'),'<!doctype html><title>Local static policy fixture</title>')
await writeFile(join(assets,'assets/index-fixturehash.js'),'export const fixture=true;')
await writeFile(join(assets,'clipper/welcome.webp'),'fixture')
await writeFile(main,`export default{fetch(){return Response.json({fixture:true},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}})}}`)
await writeFile(config,JSON.stringify({name:'clipzone-static-headers-local',main,compatibility_date:'2026-10-25',workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api','/api/*']}}))
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const previous=process.cwd(),checks=[];let worker
try{
 process.chdir(run);worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:19382,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 for(const path of ['/','/admin','/assets/index-fixturehash.js','/clipper/welcome.webp','/robots.txt','/api/admin/config']){
  const response=await worker.fetch(path),body=await response.text(),h=response.headers
  assert.equal(response.status,200)
  if(path.startsWith('/api/')){
   assert.equal(h.get('cache-control'),'no-store');assert.equal(h.get('referrer-policy'),'no-referrer')
   assert.equal(h.get('x-frame-options'),null);assert.equal(h.get('content-security-policy'),null);assert.ok(!body.includes('<!doctype'))
  }else{
   assert.equal(h.get('x-content-type-options'),'nosniff');assert.equal(h.get('x-frame-options'),'DENY')
   assert.equal(h.get('content-security-policy'),"frame-ancestors 'none'; base-uri 'self'; object-src 'none'")
   assert.equal(h.get('referrer-policy'),'strict-origin-when-cross-origin');assert.equal(h.get('strict-transport-security'),'max-age=86400')
   assert.equal(h.get('cache-control')?.includes('immutable'),path.startsWith('/assets/'))
  }
  if(path==='/robots.txt'){assert.equal(h.get('content-type'),'text/plain; charset=utf-8');assert.equal(h.get('cache-control'),'public, max-age=0, must-revalidate');assert.equal(body,await readFile(join(repo,'public/robots.txt'),'utf8'));assert.ok(!body.includes('<!doctype'))}
  checks.push({path,status:response.status,passed:true,headers:Object.fromEntries(['cache-control','referrer-policy','strict-transport-security','content-security-policy','x-frame-options','x-content-type-options'].map(key=>[key,h.get(key)]))})
 }
 const result={observedAt:new Date().toISOString(),wrangler:tool.version,passed:checks.length,checks,limits:['Local static routing fixture only; no real Google or provider playback assertion','No remote resources, credentials, data, deploy or plan changes','HSTS does not redirect the first HTTP request; HTTPS routing remains pending']}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/static-headers-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(previous)}}
