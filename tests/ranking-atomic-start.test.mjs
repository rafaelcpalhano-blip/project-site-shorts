import test from 'node:test'
import assert from 'node:assert/strict'
import {runBoundedRankingMaintenance} from '../server/ranking/continuous-maintenance.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
function fixture(count=0,intercept){
 let point=Date.parse('2026-10-28T12:00:00Z');const now=()=>new Date(point),epoch='a'.repeat(32),docs=new Map([['rankingState/metrics',{version:1,ready:true,epoch}]])
 for(let n=0;n<count;n++)docs.set('rankingRuns/'+n.toString(16).padStart(32,'0'),{version:1,status:'ready',startedAt:new Date(point-3*3600000),publishedAt:new Date(point-3*3600000)})
 const f=restFixture(docs,now),calls=[]
 const fetcher=async(url,init)=>{const operation=String(url).split(':').at(-1),body=JSON.parse(init.body);calls.push({operation,body});return intercept?intercept({url,init,operation,body,f,calls}):f.fetcher(url,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher,lazyTransactions:true})
 return {f,store,calls,now,advance:ms=>{point+=ms},run:()=>runBoundedRankingMaintenance({store,now})}
}
test('atomic start performs one commit and reserves admission plus build exactly once',async()=>{
 const d=fixture(5),r=await d.run();assert.equal(r.status,'building');assert.equal(d.calls.length,6);assert.equal(d.calls.filter(c=>c.operation==='commit').length,1)
 const query=d.calls.find(c=>c.operation==='runQuery');assert.equal(query.body.structuredQuery.limit,6);assert.deepEqual(query.body.structuredQuery.select.fields,[{fieldPath:'__name__'}]);assert.ok(query.body.transaction)
 assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').readsReserved,936);assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').writesReserved,183)
 assert.equal(d.f.docs.get('maintenanceState/rankingAdmission').observedRuns,5);assert.equal([...d.f.docs.keys()].filter(p=>p.startsWith('rankingRuns/')).length,6);assert.equal(d.f.docs.has('rankingState/current'),false)
})
test('at six retained generations no build is created and the negative recheck wait remains fifteen minutes',async()=>{
 const d=fixture(6);assert.equal((await d.run()).rankingPaused,'retention-backlog');assert.equal(d.f.docs.has('rankingState/build'),false)
 const before=structuredClone([...d.f.docs]);d.calls.length=0;d.f.docs.delete('rankingRuns/'+'0'.repeat(32));const afterDelete=structuredClone([...d.f.docs]);d.advance(15*60000-1)
 assert.equal((await d.run()).rankingPaused,'backlog-recheck-wait');assert.equal(d.calls.some(c=>c.operation==='runQuery'),false);assert.equal(d.calls.length,4);assert.equal(d.calls.filter(c=>c.operation==='batchGet').reduce((n,c)=>n+c.body.documents.length,0),4);assert.deepEqual([...d.f.docs],afterDelete);assert.equal(before.find(([p])=>p==='rankingBudgets/2026-10-28')[1].readsReserved,36)
 d.advance(1);assert.equal((await d.run()).status,'building');assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').readsReserved,972)
})
test('failed admission query leaves no pending claim, reservation, lease or build',async()=>{
 const d=fixture(0,async({operation,url,init,f})=>{if(operation==='runQuery')throw Error('fixture-query-failed');return f.fetcher(url,init)}),before=structuredClone([...d.f.docs])
 await assert.rejects(d.run(),/fixture-query-failed/);assert.deepEqual([...d.f.docs],before)
})
test('two competing starts cannot exceed six generations or double-reserve the budget',async()=>{
 const d=fixture(5),results=await Promise.all([d.run(),d.run()]);assert.ok(results.some(r=>r.status==='building'));assert.equal([...d.f.docs.keys()].filter(p=>p.startsWith('rankingRuns/')).length,6);assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').readsReserved,936);assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').writesReserved,183)
})
test('a collection phantom inserted after admission query forces retry and capacity is rechecked',async()=>{
 let injected=false;const d=fixture(5,async({url,init,operation,f})=>{const r=await f.fetcher(url,init);if(operation==='runQuery'&&!injected){injected=true;f.docs.set('rankingRuns/'+'f'.repeat(32),{status:'ready',startedAt:new Date('2026-10-28T00:00:00Z')})}return r})
 assert.equal((await d.run()).rankingPaused,'retention-backlog');assert.equal(d.f.docs.has('rankingState/build'),false);assert.equal(d.f.docs.get('rankingBudgets/2026-10-28').readsReserved,36);assert.ok(d.calls.filter(c=>c.operation==='runQuery').length>=2)
})
test('combined admission/build quota is checked before any reservation is committed',async()=>{
 for(const budget of [{version:1,readsReserved:19080,writesReserved:0,deletesReserved:0},{version:1,readsReserved:0,writesReserved:3820,deletesReserved:0},{version:1,writesReserved:0,deletesReserved:0}]){const d=fixture();d.f.docs.set('rankingBudgets/2026-10-28',budget);const before=structuredClone([...d.f.docs]);await assert.rejects(d.run(),/ranking-(budget-exhausted|invalid-budget)/);assert.deepEqual([...d.f.docs],before)}
})
test('malformed, duplicate or foreign run IDs fail closed without unscoped query fallback',async()=>{
 for(const names of [['foreign'],['a'.repeat(32),'a'.repeat(32)],Array.from({length:7},(_,n)=>n.toString(16).padStart(32,'0'))]){const d=fixture(0,async({operation,url,init,f})=>operation==='runQuery'?Response.json(names.map(id=>({document:{name:id==='foreign'?'projects/other/databases/(default)/documents/rankingRuns/'+'a'.repeat(32):'projects/clipzone-db02a/databases/(default)/documents/rankingRuns/'+id}}))):f.fetcher(url,init)),before=structuredClone([...d.f.docs]);await assert.rejects(d.run(),/ranking-invalid-cleanup-page/);assert.deepEqual([...d.f.docs],before)}
})
test('an advertised atomic capability without its transactional port never falls back to current-state admission',async()=>{
 const d=fixture(),base=d.store.transact,before=structuredClone([...d.f.docs]);d.store.transact=work=>base(tx=>work({...tx,rankingRunIds:undefined}));d.store.rankingRunsPage=async()=>{throw Error('forbidden-fallback')}
 await assert.rejects(d.run(),/atomic-admission-unavailable/);assert.deepEqual([...d.f.docs],before)
})
