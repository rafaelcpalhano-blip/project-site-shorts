import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore'
import { createRestStore } from '../../server/firestore/rest-store.ts'
import { reviewShort } from '../../server/moderation/review-short.ts'
import { loadQueue, loadDetail } from '../../server/moderation/queue.ts'
import { reportShort } from '../../server/reports/report-short.ts'
import { submitShort } from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests', visitor='b'.repeat(64), now=()=>new Date('2026-10-21T12:00:00Z')
const clean={existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]}
const store=createRestStore({projectId,emulatorPort:8081}), options={store,now,verify:async()=>clean}
let environment
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador de testes')
 environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
after(async()=>{await environment?.cleanup()})
async function seed(status='published', quota=0) {
 await environment.clearFirestore()
 await store.transact(async tx=>{
  tx.set('games/lol',{officialName:'League of Legends',status:'active'})
  tx.set('submissionLimits/'+visitor+'-2026-10-21',{identifierHash:visitor,dateKey:'2026-10-21',count:quota})
 })
 return submitShort({url:'https://clips.twitch.tv/AdminReviewClip',gameId:'lol',title:'Jogada gamer'},
  visitor,{...options,checkAbuse:async()=>{},verify:async()=>({...clean,gameMatch:'unknown',flags:status==='pending'?['threat']:[]})})
}
const action=(id,patch={})=>({shortId:id,action:'dismiss',reason:'Análise humana concluída',revision:0,reportCount:1,...patch})
async function read(path){return store.transact(tx=>tx.get(path))}
test('bounded private queues paginate tied timestamps without repeats; detail omits reporter identity',async()=>{
 await environment.clearFirestore()
 await store.transact(async tx=>{
  for(let n=1;n<=23;n++){
   const id=n.toString(16).padStart(64,'0')
   tx.set('shorts/'+id,{title:'Clip '+n,createdAt:now(),moderationStatus:'pending',normalizedUrl:'https://evil.test',gameId:'lol',platform:'Twitch'})
   tx.set('reportSummaries/'+id,{count:23,status:'pending',lastReportedAt:now()})
   tx.set('reports/'+id,{shortId:'1'.padStart(64,'0'),reason:'spam',visitorHash:visitor,createdAt:now()})
  }
 })
 for(const queue of ['reports','pending']){
  const first=await loadQueue({queue},store)
  const second=await loadQueue({queue,cursor:first.next},store)
  assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(second.next,null)
  assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,23)
 }
 const id='1'.padStart(64,'0')
 const detail=await loadDetail({shortId:id},store)
 assert.equal(detail.reports.length,20);assert.ok(detail.next)
 const next=await loadDetail({shortId:id,cursor:detail.next},store)
 assert.equal(next.reports.length,3)
 assert.ok(!JSON.stringify(detail).includes(visitor))
 const db=environment.authenticatedContext('owner',{admin:true,firebase:{sign_in_second_factor:'totp'}}).firestore()
 await assertFails(getDoc(doc(db,'reportSummaries',id)))
 await assertFails(getDocs(collection(db,'reports')))
 await assertFails(setDoc(doc(db,'shorts',id),{moderationStatus:'published'}))
})
test('concurrent dismissal writes one audit; new reports reopen while keeping publication and review watermark',async()=>{
 const {id}=await seed()
 await reportShort({shortId:id,reason:'spam'},'c'.repeat(64),options)
 const outcomes=await Promise.allSettled([reviewShort(action(id),'owner',options),reviewShort(action(id),'owner',options)])
 assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1)
 assert.equal((await read('shorts/'+id)).moderationStatus,'published')
 assert.equal((await read('reportSummaries/'+id)).reviewedCount,1)
 await reportShort({shortId:id,reason:'wrong-game'},'d'.repeat(64),options)
 const summary=await read('reportSummaries/'+id)
 assert.equal(summary.status,'pending');assert.equal(summary.count,2);assert.equal(summary.reviewedCount,1)
 await assert.rejects(reviewShort(action(id,{revision:1}),'owner',options),/stale-review/)
 assert.equal((await read('shorts/'+id)).reviewVersion,1)
 const detail=await loadDetail({shortId:id},store)
 assert.equal(detail.logs.filter(log=>log.action==='dismiss').length,1)
})
test('removal preserves reservation and quota; resubmission stays blocked and public access is denied',async()=>{
 const {id}=await seed()
 await reportShort({shortId:id,reason:'real-violence'},'c'.repeat(64),options)
 const quota=await read('submissionLimits/'+visitor+'-2026-10-21')
 await reviewShort(action(id,{action:'remove'}),'owner',options)
 assert.equal((await read('shorts/'+id)).moderationStatus,'removed')
 assert.ok(await read('videoIdentities/'+id))
 assert.deepEqual(await read('submissionLimits/'+visitor+'-2026-10-21'),quota)
 await assert.rejects(submitShort({url:'https://clips.twitch.tv/AdminReviewClip',gameId:'lol'},visitor,{...options,checkAbuse:async()=>{}}),/duplicate-video/)
 await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(),'shorts',id)))
 await assert.rejects(reviewShort(action(id,{action:'approve',revision:1}),'owner',options),/stale-review/)
})
test('concurrent approval consumes only one slot on approval day and records authenticated actor',async()=>{
 const {id}=await seed('pending',4)
 const results=await Promise.allSettled([reviewShort(action(id,{action:'approve',reportCount:0}),'owner',options),reviewShort(action(id,{action:'approve',reportCount:0}),'owner',options)])
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1)
 assert.equal((await read('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 assert.equal((await read('shorts/'+id)).moderationStatus,'published')
 await environment.withSecurityRulesDisabled(async context=>{
  const logs=(await getDocs(collection(context.firestore(),'moderationLogs'))).docs.map(doc=>doc.data()).filter(log=>log.action==='approve')
  assert.equal(logs.length,1);assert.equal(logs[0].actor,'owner')
 })
})
test('quota exhaustion, technical uncertainty and inactive game leave pending video and audit unchanged',async()=>{
 const {id}=await seed('pending',5)
 const input=action(id,{action:'approve',reportCount:0})
 await assert.rejects(reviewShort(input,'owner',options),/daily-limit/)
 await assert.rejects(reviewShort(input,'owner',{...options,verify:async()=>({...clean,existence:'unknown'})}),/verification-incomplete/)
 for (const embedding of ['blocked','unknown']) {
  await assert.rejects(reviewShort(input,'owner',{...options,verify:async()=>({...clean,embedding})}),/verification-incomplete/)
 }
 await store.transact(async tx=>tx.set('games/lol',{status:'disabled'}))
 await assert.rejects(reviewShort(input,'owner',options),/invalid-video/)
 assert.equal((await read('shorts/'+id)).moderationStatus,'pending')
 assert.equal((await read('shorts/'+id)).reviewVersion,undefined)
 assert.equal((await read('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 await environment.withSecurityRulesDisabled(async context=>{
  const logs=(await getDocs(collection(context.firestore(),'moderationLogs'))).docs.map(doc=>doc.data())
  assert.equal(logs.filter(log=>log.actor==='owner').length,0)
 })
})
test('report racing with removal cannot be silently archived without the reviewed count',async()=>{
 const {id}=await seed()
 await reportShort({shortId:id,reason:'spam'},'c'.repeat(64),options)
 const outcomes=await Promise.allSettled([
  reviewShort(action(id,{action:'remove'}),'owner',options),
  reportShort({shortId:id,reason:'hate-threat'},'d'.repeat(64),options),
 ])
 const short=await read('shorts/'+id),summary=await read('reportSummaries/'+id)
 if(short.moderationStatus==='removed'){
  assert.equal(summary.count,1);assert.equal(summary.reviewedCount,1)
  assert.equal(outcomes[1].status,'rejected')
 }else{
  assert.equal(summary.count,2);assert.equal(summary.status,'pending')
  assert.equal(outcomes[0].status,'rejected')
 }
})

test('published restoration preserves ID, reservation and past quota; concurrent retries write one audit',async()=>{
 const {id}=await seed()
 await reviewShort(action(id,{action:'remove',reportCount:0}),'owner',options)
 assert.equal((await loadQueue({queue:'removed'},store)).items[0].id,id)
 const detail=await loadDetail({shortId:id},store)
 assert.equal(detail.short.restoreStatus,'published')
 const savedQuota=await read('submissionLimits/'+visitor+'-2026-10-21')
 const later={...options,now:()=>new Date('2026-10-22T12:00:00Z')}
 const input=action(id,{action:'restore',revision:1,reportCount:0})
 const results=await Promise.allSettled([reviewShort(input,'owner',later),reviewShort(input,'owner',later)])
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1)
 assert.equal((await read('shorts/'+id)).moderationStatus,'published')
 assert.equal((await read('shorts/'+id)).reviewVersion,2)
 assert.equal((await read('videoIdentities/'+id)).shortId,id)
 assert.deepEqual(await read('submissionLimits/'+visitor+'-2026-10-21'),savedQuota)
 assert.equal(await read('submissionLimits/'+visitor+'-2026-10-22'),null)
 assert.equal((await loadQueue({queue:'removed'},store)).items.length,0)
 const restored=await loadDetail({shortId:id},store)
 assert.equal(restored.logs.filter(log=>log.action==='restore').length,1)
 await assert.rejects(submitShort({url:'https://clips.twitch.tv/AdminReviewClip',gameId:'lol'},visitor,{...options,checkAbuse:async()=>{}}),/duplicate-video/)
 await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(),'moderationStates',id)))
})
test('restoring pending returns to review without publishing, spending quota or bypassing later approval',async()=>{
 const {id}=await seed('pending',5)
 await reviewShort(action(id,{action:'remove',reportCount:0}),'owner',options)
 await reviewShort(action(id,{action:'restore',revision:1,reportCount:0}),'owner',
  {...options,verify:async()=>{throw new Error('must not verify a private pending restoration')}})
 assert.equal((await read('shorts/'+id)).moderationStatus,'pending')
 assert.equal((await read('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 assert.equal((await loadQueue({queue:'pending'},store)).items[0].id,id)
 await assert.rejects(reviewShort(action(id,{action:'approve',revision:2,reportCount:0}),'owner',options),/daily-limit/)
 await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(),'shorts',id)))
})
test('legacy removed records without trustworthy state cannot be restored or select their own target',async()=>{
 const {id}=await seed()
 await store.transact(async tx=>{
  const short=await tx.get('shorts/'+id)
  tx.set('shorts/'+id,{...short,moderationStatus:'removed'})
 })
 const detail=await loadDetail({shortId:id},store)
 assert.equal(detail.short.restoreStatus,null)
 await assert.rejects(reviewShort(action(id,{action:'restore',reportCount:0}),'owner',options),/restore-unavailable/)
 await store.transact(async tx=>tx.set('moderationStates/'+id,{previousStatus:'published',removedRevision:99}))
 await assert.rejects(reviewShort(action(id,{action:'restore',reportCount:0}),'owner',options),/restore-unavailable/)
 assert.equal((await read('shorts/'+id)).moderationStatus,'removed')
})
test('failed technical checks, inactive game and data changes preserve removed state and quota',async()=>{
 const {id}=await seed()
 await reviewShort(action(id,{action:'remove',reportCount:0}),'owner',options)
 const input=action(id,{action:'restore',revision:1,reportCount:0})
 const quota=await read('submissionLimits/'+visitor+'-2026-10-21')
 await assert.rejects(reviewShort(input,'owner',{...options,verify:async()=>({...clean,existence:'missing'})}),/verification-incomplete/)
 for (const embedding of ['blocked','unknown']) {
  await assert.rejects(reviewShort(input,'owner',{...options,verify:async()=>({...clean,embedding})}),/verification-incomplete/)
 }
 await store.transact(async tx=>tx.set('games/lol',{status:'disabled'}))
 await assert.rejects(reviewShort(input,'owner',options),/invalid-video/)
 await store.transact(async tx=>tx.set('games/lol',{status:'active'}))
 await assert.rejects(reviewShort(input,'owner',{...options,verify:async()=>{
  await store.transact(async tx=>{
   const short=await tx.get('shorts/'+id)
   tx.set('shorts/'+id,{...short,title:'Alterado durante validação'})
  })
  return clean
 }}),/stale-review/)
 assert.equal((await read('shorts/'+id)).moderationStatus,'removed')
 assert.equal((await read('shorts/'+id)).reviewVersion,1)
 assert.deepEqual(await read('submissionLimits/'+visitor+'-2026-10-21'),quota)
 const detail=await loadDetail({shortId:id},store)
 assert.equal(detail.logs.filter(log=>log.action==='restore').length,0)
})
