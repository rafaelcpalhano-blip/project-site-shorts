import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import cp from 'node:child_process'
import http from 'node:http'
import {gzipSync} from 'node:zlib'
const require=createRequire(import.meta.url),firebase=createRequire(require.resolve('firebase-tools/package.json'))

test('Firebase CLI loads and prints its version without using the owner credential/config directory',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clipzone-cli-smoke-'))
 try{
  const env={HOME:temp,USERPROFILE:temp,APPDATA:temp,LOCALAPPDATA:temp,XDG_CONFIG_HOME:temp,FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',NO_UPDATE_NOTIFIER:'1',CI:'true'}
  for(const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','ComSpec'])if(process.env[name])env[name]=process.env[name]
  const cli=path.join(path.dirname(require.resolve('firebase-tools/package.json')),'lib/bin/firebase.js')
  const version=cp.execFileSync(process.execPath,[cli,'--version'],{env,encoding:'utf8',windowsHide:true,timeout:15000}).trim()
  assert.equal(version,require('firebase-tools/package.json').version)
 }finally{const target=path.resolve(temp);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(target).startsWith('clipzone-cli-smoke-'));fs.rmSync(target,{recursive:true,force:true})}
})

test('gaxios still creates and streams multipart bodies with its scoped UUID override, without HTTP',async()=>{
 const {Gaxios}=firebase('gaxios');let called=false
 const response=await new Gaxios().request({url:'https://fixture.invalid/no-network',method:'POST',multipart:[{headers:{'Content-Type':'text/plain'},content:'fixture-payload'}],adapter:async options=>{
  called=true;const chunks=[];for await(const chunk of options.body)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks).toString()
  const contentType=options.headers['Content-Type'];assert.match(contentType,/boundary=[a-f0-9-]{36}/);assert.ok(body.includes('fixture-payload'))
  return {config:options,data:{ok:true},status:200,statusText:'OK',headers:{}}
 }})
 assert.equal(called,true);assert.equal(response.data.ok,true)
})

test('PubSub trace propagation round-trips using the patched scoped OpenTelemetry core without a client or credentials',()=>{
 const pubsub=createRequire(firebase.resolve('@google-cloud/pubsub/package.json')),api=pubsub('@opentelemetry/api'),core=pubsub('@opentelemetry/core')
 const tracing=pubsub('./build/src/telemetry-tracing.js'),traceId='a'.repeat(32),spanId='b'.repeat(16),message={}
 tracing.setGloballyEnabled(true)
 try{
  tracing.injectSpan(api.trace.wrapSpanContext({traceId,spanId,traceFlags:1}),message)
  assert.equal(message.attributes.googclient_traceparent,'00-'+traceId+'-'+spanId+'-01')
  delete message.parentSpan
  const extracted=new core.W3CTraceContextPropagator().extract(api.ROOT_CONTEXT,message,tracing.pubsubGetter)
  assert.equal(api.trace.getSpanContext(extracted).traceId,traceId);assert.equal(tracing.containsSpanContext(message),true)
 }finally{tracing.setGloballyEnabled(false)}
})

for(const variant of ['firebase','mcp'])test('body-parser '+variant+' handles valid gzip and trailing garbage on loopback without crashing',{timeout:10000},async()=>{
 const owner=variant==='firebase'?firebase:createRequire(firebase.resolve('@modelcontextprotocol/sdk/package.json'))
 const parser=owner('body-parser').json(),server=http.createServer((req,res)=>parser(req,res,error=>{res.statusCode=error?400:200;res.end(error?'invalid':JSON.stringify(req.body))}))
 const send=body=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/',method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip','Content-Length':body.length}},res=>{let text='';res.on('data',c=>{text+=c});res.on('end',()=>resolve({status:res.statusCode,text}))});req.on('error',reject);req.end(body)})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const good=await send(gzipSync('{"ok":true}'));assert.equal(good.status,200);assert.equal(JSON.parse(good.text).ok,true)
  const bad=await send(Buffer.concat([gzipSync('{"ok":true}'),Buffer.from('trailing-invalid-bytes')]))
  assert.equal(bad.status,400)
 }finally{await new Promise(resolve=>server.close(resolve))}
})
