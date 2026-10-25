import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {generateKeyPairSync,sign} from 'node:crypto'
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const lab=resolve(process.argv[2]??''),repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),distance=relative(repo,lab)
assert.ok(process.argv[2]&&(isAbsolute(distance)||distance.startsWith('..'+sep)),'Use external approved lab')
const tool=JSON.parse(await readFile(join(lab,'node_modules/wrangler/package.json'),'utf8'));assert.equal(tool.version,'4.152.0')
process.env.WRANGLER_SEND_METRICS='false';process.env.CLOUDFLARE_SEND_METRICS='false';process.env.CI='true'
for(const key of Object.keys(process.env))if(/^(CLOUDFLARE_API_|CLOUDFLARE_ACCOUNT_ID$|CF_API_|CF_ACCOUNT_ID$)/.test(key))delete process.env[key]
const run=await mkdtemp(join(lab,'free-audit-')),assets=join(run,'assets'),config=join(run,'wrangler.json'),main=join(repo,'tests/runtime/worker-free-audit-probe.ts')
await mkdir(join(assets,'assets'),{recursive:true});await mkdir(join(assets,'api'))
await writeFile(join(assets,'index.html'),'<!doctype html><title>Fixture</title>FREE AUDIT SPA');await writeFile(join(assets,'assets/app.js'),'globalThis.fixture = true;');await writeFile(join(assets,'api/collision'),'MUST NOT SHADOW API')
await writeFile(config,JSON.stringify({name:'clipzone-local-free-audit',main,compatibility_date:'2026-10-25',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,send_metrics:false,assets:{directory:assets,binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api','/api/*','/__route-count','/__free-proof','/__fetch-proof','/__prepare','/__run']}},null,2))
const keys=generateKeyPairSync('rsa',{modulusLength:2048}),claims={sub:'owner',email:'owner@example.test',email_verified:true,aud:'clipzone-test',iss:'https://securetoken.google.com/clipzone-test',iat:1899999990,exp:1900003500,auth_time:1899999980,firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp',second_factor_identifier:'factor-1'}}
const content=[{alg:'RS256',kid:'key-1'},claims].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.'),fixture={publicPem:keys.publicKey.export({type:'spki',format:'pem'}).toString(),token:content+'.'+sign('RSA-SHA256',Buffer.from(content),keys.privateKey).toString('base64url')}
const {default:InspectorSocket}=await import(pathToFileURL(join(lab,'node_modules/ws/index.js')).href)
async function attach(url){
 const target=new URL(url);assert.ok(['localhost','127.0.0.1','[::1]'].includes(target.hostname),'Inspector must stay in loopback');target.hostname='127.0.0.1';target.port='8799'
 const socket=new InspectorSocket(target,{headers:{Origin:'http://localhost:8799'},followRedirects:false}),pending=new Map();let id=0
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('inspector-open-timeout')),5000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});socket.addEventListener('error',event=>{clearTimeout(timer);reject(Error('inspector-open-failed: '+event.message))},{once:true})})
 socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),slot=pending.get(message.id);if(slot){pending.delete(message.id);clearTimeout(slot.timer);message.error?slot.reject(Error(message.error.message)):slot.resolve(message.result)}})
 return {send:(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(Error('inspector-command-timeout'))},5000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}))}),close:()=>{for(const slot of pending.values()){clearTimeout(slot.timer);slot.reject(Error('inspector-closed'))}pending.clear();socket.close()}}
}

const {unstable_dev}=await import(pathToFileURL(join(lab,'node_modules/wrangler/wrangler-dist/cli.js')).href)
let redirectHits=0,targetHits=0
const upstream=createServer((request,response)=>{if(request.url==='/redirect'){redirectHits++;response.writeHead(302,{Location:'http://127.0.0.1:8797/target'});response.end()}else{targetHits++;response.end('must not follow')}})
await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(8797,'127.0.0.1',resolve)})
const prior=process.cwd();let worker,cdp
try{
 process.chdir(run)
 worker=await unstable_dev(main,{config,envFiles:[],local:true,ip:'127.0.0.1',port:8798,inspectorPort:8799,persist:false,logLevel:'error',experimental:{forceLocal:true,disableExperimentalWarning:true,disableDevRegistry:true,showInteractiveDevSession:false,watch:false}})
 const response=await worker.fetch('/__free-proof'),ingress=await response.json();assert.equal(response.status,200,JSON.stringify(ingress));assert.equal(ingress.passed.length,6)
 const fetchProof=await (await worker.fetch('/__fetch-proof')).json();assert.equal(fetchProof.refused,true);assert.equal(redirectHits,1);assert.equal(targetHits,0)
 const beforeAssets=(await (await worker.fetch('/__route-count')).json()).invocations
 const script=await worker.fetch('/assets/app.js');assert.equal(script.status,200);assert.equal(script.headers.has('x-fixture-worker'),false);assert.match(await script.text(),/fixture/)
 const afterAssets=(await (await worker.fetch('/__route-count')).json()).invocations;assert.equal(afterAssets-beforeAssets,1,'static asset must not invoke Worker')
 const collision=await worker.fetch('/api/collision',{headers:{Accept:'text/html','Sec-Fetch-Mode':'navigate'}});assert.equal(collision.status,404);assert.equal(collision.headers.get('x-fixture-worker'),'yes');assert.deepEqual(await collision.json(),{error:'not-found'})
 const target=(await (await fetch('http://127.0.0.1:8799/json/list')).json())[0];cdp=await attach(target.webSocketDebuggerUrl);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100})
 await mkdir(join(lab,'evidence'),{recursive:true});const workloads=[]
 for(const name of process.argv.includes('--transport-only')?[]:['publication-cold','publication-warm','like','comment','auth-cold','auth-warm','moderation-remove','ranking-100']){
  const prepared=await worker.fetch('/__prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,fixture})});assert.equal(prepared.status,200,await prepared.text())
  await cdp.send('Profiler.start');const results=[],wall=[]
  for(let i=0;i<10;i++){const start=performance.now(),response=await worker.fetch('/__run'),body=await response.json();assert.equal(response.status,200,JSON.stringify(body));results.push(body);wall.push(performance.now()-start)}
  const {profile}=await cdp.send('Profiler.stop');assert.ok(profile.samples?.length)
  const nodes=new Map(profile.nodes.map(node=>[node.id,node.callFrame.functionName])),idle=new Set(['(idle)','(program)'])
  let sampledNonIdleUs=0,sampledIdleUs=0
  for(let i=0;i<profile.samples.length;i++){const delta=profile.timeDeltas?.[i]??0;if(idle.has(nodes.get(profile.samples[i])))sampledIdleUs+=delta;else sampledNonIdleUs+=delta}
  await writeFile(join(lab,'evidence/free-'+name+'.cpuprofile'),JSON.stringify(profile))
  assert.ok(results.every(item=>JSON.stringify(item.counts)===JSON.stringify(results[0].counts)))
  const row={name,requests:10,counts:results[0].counts,samples:profile.samples.length,profileSpanUs:profile.endTime-profile.startTime,sampledNonIdleUs,sampledIdleUs,sampledNonIdleMeanMs:sampledNonIdleUs/10000,wallMeanMs:wall.reduce((a,b)=>a+b,0)/10,wallMaxMs:Math.max(...wall),productionCpuCertified:false}
  workloads.push(row);console.log(JSON.stringify(row))
 }
 const result={created:new Date().toISOString(),versions:{wrangler:tool.version,workerd:JSON.parse(await readFile(join(lab,'node_modules/workerd/package.json'),'utf8')).version},ingress,nativeFetch:{redirectRefused:fetchProof.refused,redirectHits,targetHits},routing:['static JS uses assets route','API wins over colliding asset and SPA navigation'],workloads,limits:['V8 sample estimates include synthetic-store/provider and profiler overhead; not billed CPU','no REST serialization, real providers, OAuth signer or remote network measured','no edge attestation; metadata in ingress tests is synthetic','no account plan, IAM, Spark or TOTP configuration inspected'],deployReady:false}
 await writeFile(join(lab,process.argv.includes('--transport-only')?'evidence/free-transport-result.json':'evidence/free-audit-result.json'),JSON.stringify(result,null,2))
}finally{try{cdp?.close();if(worker)await worker.stop();await new Promise(resolve=>upstream.close(resolve))}finally{process.chdir(prior)}}
