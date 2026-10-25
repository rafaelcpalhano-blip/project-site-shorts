import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
const lab=resolve(process.argv[2]??''),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'Use approved external lab')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'entry-')),assets=join(run,'assets'),config=join(run,'wrangler.json'),main=join(repo,'tests/runtime/worker-entry-probe.ts')
await mkdir(assets);await writeFile(join(assets,'index.html'),'<!doctype html><title>Fixture</title>WORKER ENTRY SPA FIXTURE')
await writeFile(config,JSON.stringify({name:'clipzone-local-entry-proof',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:true}},null,2))
const {default:InspectorSocket}=await import(pathToFileURL(join(lab,'node_modules/ws/index.js')).href)
async function attach(url){
 const target=new URL(url);assert.ok(['localhost','127.0.0.1','[::1]'].includes(target.hostname),'Inspector must stay in loopback');target.hostname='127.0.0.1';target.port='8799'
 const socket=new InspectorSocket(target,{headers:{Origin:'http://localhost:8799'},followRedirects:false}),pending=new Map();let id=0
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('inspector-open-timeout')),5000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});socket.addEventListener('error',event=>{clearTimeout(timer);reject(Error('inspector-open-failed: '+event.message))},{once:true})})
 socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),slot=pending.get(message.id);if(slot){pending.delete(message.id);clearTimeout(slot.timer);message.error?slot.reject(Error(message.error.message)):slot.resolve(message.result)}})
 return {send:(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(Error('inspector-command-timeout'))},5000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}))}),close:()=>{for(const slot of pending.values()){clearTimeout(slot.timer);slot.reject(Error('inspector-closed'))}pending.clear();socket.close()}}
}
const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
const prior=process.cwd();let worker,cdp
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:8799,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const proof=await worker.fetch('/__entry-proof'),result=await proof.json();assert.equal(proof.status,200,JSON.stringify(result));assert.equal(result.passed.length,12)
 const routing=[]
 const session=await worker.fetch('/api/session',{method:'POST',headers:{Origin:'https://clipzone.test','Content-Type':'application/json'},body:'{}'});assert.equal(session.status,204);assert.match(session.headers.get('set-cookie'),/Secure/);routing.push('real API session preserves secure cookie')
 const unknown=await worker.fetch('/api/unknown',{headers:{Accept:'text/html','Sec-Fetch-Mode':'navigate'}});assert.equal(unknown.status,404);assert.deepEqual(await unknown.json(),{error:'not-found'});routing.push('API unknown remains JSON through entry')
 const cross=await worker.fetch('/api/session',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'});assert.equal(cross.status,403);routing.push('foreign origin rejected through entry')
 const page=await worker.fetch('/jogos/fixture',{headers:{Accept:'text/html','Sec-Fetch-Mode':'navigate'}});assert.equal(page.status,200);assert.match(await page.text(),/WORKER ENTRY SPA FIXTURE/);routing.push('ASSETS binding preserves SPA navigation')
 let cpu
 try{
  const targets=await (await fetch('http://127.0.0.1:8799/json/list')).json();assert.ok(Array.isArray(targets)&&targets[0]?.webSocketDebuggerUrl,'No local inspector target')
  cdp=await attach(targets[0].webSocketDebuggerUrl)
  await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start')
  const wallTimes=[]
  for(let i=0;i<5;i++){const start=performance.now(),response=await worker.fetch('/__cpu-fixture'),body=await response.json();assert.equal(response.status,200);assert.equal(body.fixture.status,200);wallTimes.push(performance.now()-start)}
  const {profile}=await cdp.send('Profiler.stop');assert.ok(profile.nodes?.length&&profile.samples?.length,'No V8 samples captured')
  await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/entry-cpu.cpuprofile'),JSON.stringify(profile))
  const names=new Map(profile.nodes.map(node=>[node.id,node.callFrame.functionName||'(anonymous)'])),times=new Map()
  for(let i=0;i<profile.samples.length;i++){const name=names.get(profile.samples[i])??'(unknown)';times.set(name,(times.get(name)??0)+(profile.timeDeltas?.[i]??0))}
  cpu={available:true,fixtureRequests:5,samples:profile.samples.length,requestedSamplingIntervalUs:100,wallTimesMs:wallTimes,profileSpanUs:profile.endTime-profile.startTime,topSampleTimelineUs:[...times].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([functionName,timelineUs])=>({functionName,timelineUs})),profileFile:'entry-cpu.cpuprofile',productionCpuCertified:false,interpretation:'Sample timeline includes idle, fixture overhead and I/O; not billed CPU per request.'}
 }catch(error){cpu={available:false,reason:error.message,productionCpuCertified:false}}
 const artifact={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(join(lab,'node_modules/workerd/package.json'),'utf8')).version},entryProof:result,routing,cpu,deployReady:false,limits:['local test bridge rewrites origin and supplies constant trusted IP','no real Cloudflare ingress or Google data','worker-first-all is a lab config, not an approved billing/routing policy','external cover decision still open']}
 await mkdir(join(lab,'evidence'),{recursive:true});await writeFile(join(lab,'evidence/entry-result.json'),JSON.stringify(artifact,null,2))
 console.log(JSON.stringify({entryChecks:result.passed.length,routingChecks:routing.length,cpu,deployReady:false},null,2))
}finally{try{cdp?.close();if(worker)await worker.stop()}finally{process.chdir(prior)}}
