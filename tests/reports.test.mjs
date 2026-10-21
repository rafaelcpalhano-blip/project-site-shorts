import test from 'node:test'
import assert from 'node:assert/strict'
import { handleReport } from '../server/http/reports.ts'
import { createReportClient } from '../src/features/reports/report-api.ts'
import { SubmissionError } from '../server/submissions/submit-short.ts'
const origin='https://clipzone.example', input={shortId:'a'.repeat(64),reason:'spam'}
const request=(body=input,headers={})=>new Request(origin+'/api/reports',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
const deps={origin,now:()=>new Date(),resolveVisitor:async()=> 'b'.repeat(64),checkAbuse:async()=>{},store:{transact:async work=>work({get:async path=>path.startsWith('shorts/')?{moderationStatus:'published'}:null,create(){},set(){}})}}
test('HTTP requires trusted session, origin, JSON, rate limit and bounded body',async()=>{
 assert.equal((await handleReport(request())).status,503)
 assert.equal((await handleReport(new Request(origin),deps)).status,405)
 assert.equal((await handleReport(request(input,{origin:'https://evil.example'}),deps)).status,403)
 assert.equal((await handleReport(request(input,{'content-type':'text/plain'}),deps)).status,415)
 assert.equal((await handleReport(request(),{...deps,resolveVisitor:async()=>null})).status,401)
 assert.equal((await handleReport(request({...input,visitor:'forged'}),deps)).status,400)
 assert.equal((await handleReport(request({reason:'x'.repeat(9000)}),deps)).status,413)
 assert.equal((await handleReport(request(),{...deps,checkAbuse:async()=>{throw new SubmissionError('abuse-limit')}})).status,429)
 const response=await handleReport(request(),deps)
 assert.equal(response.headers.get('cache-control'),'no-store')
 assert.deepEqual(await response.json(),{received:true,duplicate:false})
})
test('client creates session, accepts duplicate acknowledgement, never retries or trusts provider messages',async()=>{
 const calls=[]
 const send=createReportClient(async(path,options)=>{calls.push([path,options]);return path==='/api/session'?new Response(null,{status:204}):Response.json({received:true,duplicate:true})})
 assert.deepEqual(await send(input),{duplicate:true})
 assert.deepEqual(JSON.parse(calls[1][1].body),input)
 assert.equal(calls[1][1].credentials,'same-origin')
 let count=0
 await assert.rejects(createReportClient(async()=>{count++;return new Response('secret',{status:503})})(input),/Não foi possível/)
 assert.equal(count,1)
 await assert.rejects(createReportClient(async()=>Response.json({received:false}))(input),/Resposta inesperada/)
})
