import test from 'node:test'
import {submitShort} from '../server/submissions/submit-short.ts'
import assert from 'node:assert/strict'
import {updateFields} from '../server/admin/update-event.ts'
import {memory} from './helpers/refinements-store.mjs'
import {loadUpdates,markUpdateRead} from '../server/admin/updates.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
import {reportShort} from '../server/reports/report-short.ts'
import {loadAdminHistory} from '../server/admin/history.ts'
const id='a'.repeat(64),now=()=>new Date('2026-10-25T12:00:00Z')
const event=(category='playback')=>({...updateFields(category,{shortId:id,title:'Clip',platform:'YouTube'}),createdAt:now(),eventVersion:1,eligibleCount:15})
test('20+1 cursor pagination, category filters and independent versioned read state preserve audit events',async()=>{
 const f=memory([['shorts/'+id,{moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/28nFy4tGcwI'}]]);for(let i=0;i<25;i++)f.records.set('moderationLogs/e'+String(i).padStart(2,'0'),event(i===0?'reports':'playback'))
 const first=await loadUpdates({},'admin-A',f.store);assert.equal(first.items.length,20);assert.ok(first.next);assert.equal(first.items[0].source,'https://www.youtube.com/shorts/28nFy4tGcwI');assert.ok(f.reads<=60)
 const second=await loadUpdates({cursor:first.next},'admin-A',f.store);assert.equal(second.items.length,5);assert.equal(new Set([...first.items,...second.items].map(e=>e.id)).size,25)
 const row=first.items[0],before=structuredClone(f.records.get('moderationLogs/'+row.id));await markUpdateRead({id:row.id,version:1},'admin-A',f.store,now);assert.deepEqual(f.records.get('moderationLogs/'+row.id),before)
 assert.equal((await loadUpdates({},'admin-A',f.store)).items[0].read,true);assert.equal((await loadUpdates({},'admin-B',f.store)).items[0].read,false)
 f.records.set('moderationLogs/'+row.id,{...before,eventVersion:2});await markUpdateRead({id:row.id,version:1},'admin-A',f.store,now);assert.equal((await loadUpdates({},'admin-A',f.store)).items[0].read,false)
 assert.equal((await loadUpdates({category:'reports'},'admin-A',f.store)).items.length,1);await assert.rejects(loadUpdates({category:'reports',cursor:first.next},'admin-A',f.store),/invalid-input/)
})
test('historical playback events do not inherit a later cycle; untrusted source schemes are not linked',async()=>{
 const f=memory([['moderationLogs/old',event()],['shorts/'+id,{moderationStatus:'published',normalizedUrl:'javascript:alert(1)'}],['playbackSummaries/'+id,{eventId:'new',eligibleCount:999,contextCount:888}]]);const result=await loadUpdates({},'owner',f.store);assert.equal(result.items[0].count,15);assert.equal(result.items[0].contextCount,0);assert.equal(result.items[0].source,null)
})
test('only a new accepted report adds a server inbox event; retries preserve data and quotas',async()=>{
 const f=memory([['games/portal',{status:'active'}],['shorts/'+id,{gameId:'portal',title:'Clip',platform:'Twitch',moderationStatus:'published'}]]);const input={shortId:id,reason:'spam'},deps={store:f.store,now};await Promise.all([reportShort(input,'b'.repeat(64),deps),reportShort(input,'b'.repeat(64),deps)]);assert.equal([...f.records].filter(([key])=>key.startsWith('moderationLogs/')).length,1);assert.equal(f.records.get('shorts/'+id).moderationStatus,'published')
})
test('every updates endpoint rechecks admin authorization and origin, aliases resolve only on private history',async()=>{
 const f=memory([['publicIdentifiers/mn0000',{kind:'manual-game',internalId:'manual-original'}],['games/manual-original',{officialName:'Portal'}]]);assert.deepEqual((await loadAdminHistory({kind:'game',id:'mn0000'},f.store)).items,[])
 const origin='https://clipzone.test';let auth=0;const api=await createPublicApi({origin,store:f.store,now,visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('unused')},admin:{publicConfig:{},authorize:async req=>{auth++;if(req.headers.get('authorization')!=='Bearer owner')throw new AdminAuthError('admin-forbidden',403);return {uid:'owner'}}}})
 const req=(path,body={},headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});const cookie=(await api(req('/api/session'))).headers.get('set-cookie').split(';')[0]
 for(const path of ['/api/admin/updates','/api/admin/updates/read']){assert.equal((await api(req(path,{}, {cookie}))).status,403);assert.equal((await api(req(path,{}, {cookie,authorization:'Bearer owner',origin:'https://evil.test'}))).status,403)}
 assert.equal((await api(req('/api/admin/updates',{}, {cookie,authorization:'Bearer owner'}))).status,200);assert.equal(auth,3)
})

test('successful publication emits one inbox event with game/title; replay and pending do not create false publication events',async()=>{
 const f=memory([['games/portal',{status:'active',officialName:'Portal'}]]),input={url:'https://www.youtube.com/shorts/28nFy4tGcwI',gameId:'portal',title:'Jogada',channelName:'Canal'},deps={store:f.store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',embedding:'allowed',gameMatch:'unknown',moderation:'clear',flags:[]})}
 await submitShort(input,'b'.repeat(64),deps);await assert.rejects(submitShort(input,'b'.repeat(64),deps),/duplicate-video/);const page=await loadUpdates({category:'published'},'owner',f.store);assert.equal(page.items.length,1);assert.equal(page.items[0].gameName,'Portal');assert.equal(page.items[0].title,'Jogada')
 const other=memory([['games/portal',{status:'active',officialName:'Portal'}]]);await submitShort(input,'b'.repeat(64),{...deps,store:other.store,verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'flagged',flags:['threat']})});assert.equal((await loadUpdates({category:'published'},'owner',other.store)).items.length,0)
})
