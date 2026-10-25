import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
const lab=resolve(process.argv[2]??'')
assert.ok(process.argv[2],'Supply isolated lab directory')
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(isAbsolute(distance)||distance.startsWith('..'+sep),'Lab must be outside repository')
const tool=JSON.parse(await readFile(resolve(lab,'node_modules/wrangler/package.json'),'utf8'))
assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'cover-contract-')),assets=join(run,'assets'),main=resolve(repo,'tests/runtime/worker-cover-contract-probe.ts'),config=join(run,'wrangler.json')
await mkdir(join(assets,'images/games'),{recursive:true})
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=','base64')
await writeFile(join(assets,'images/games/fixture.png'),image)
await writeFile(join(assets,'index.html'),'<!doctype html><title>Fixture</title>TEST SPA')
await writeFile(config,JSON.stringify({name:'clipzone-local-cover-contract',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/__cover-contract-proof','/images/games/*']}},null,2))
const {unstable_dev}=await import(pathToFileURL(resolve(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:0,inspect:false,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__cover-contract-proof'),proof=await response.json()
 assert.equal(response.status,200);assert.equal(proof.passed.length,7)
 const cover=await worker.fetch('/images/games/fixture.png',{headers:{Accept:'image/png'}})
 assert.equal(cover.status,200);assert.match(cover.headers.get('content-type'),/^image\/png/);assert.deepEqual(Buffer.from(await cover.arrayBuffer()),image)
 const missing=await worker.fetch('/images/games/missing.png',{headers:{Accept:'image/png'}})
 assert.equal(missing.status,404);assert.equal(await missing.text(),'');assert.equal(missing.headers.get('cache-control'),'no-store')
 const head=await worker.fetch('/images/games/fixture.png',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('content-type'),'image/png')
 const etag=cover.headers.get('etag');assert.ok(etag)
 const cached=await worker.fetch('/images/games/fixture.png',{headers:{'If-None-Match':etag}});assert.equal(cached.status,304)
 const page=await worker.fetch('/jogos/fixture',{headers:{Accept:'text/html','Sec-Fetch-Mode':'navigate'}});assert.equal(page.status,200);assert.match(await page.text(),/TEST SPA/)
 const result={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(resolve(lab,'node_modules/workerd/package.json'),'utf8')).version},proof,assets:['existing static PNG served with exact bytes and image/png','missing image returns empty 404 without SPA HTML','HEAD keeps image metadata without body','conditional ETag returns 304','page navigation keeps SPA fallback'],fixtureOnly:true,deployReady:false}
 await mkdir(resolve(lab,'evidence'),{recursive:true});await writeFile(resolve(lab,'evidence/cover-contract-result.json'),JSON.stringify(result,null,2))
 console.log(JSON.stringify(result,null,2))
}finally{try{if(worker)await worker.stop()}finally{process.chdir(prior)}}
