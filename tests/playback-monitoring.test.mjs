import test from 'node:test'
import assert from 'node:assert/strict'
import {memory} from './helpers/refinements-store.mjs'
import {recordPlaybackFailure,playbackWindowMs} from '../server/playback/record-failure.ts'
import {handlePlaybackFailure} from '../server/http/playback-failure.ts'
import {createPlaybackFailureClient} from '../src/features/players/services/playback-failure-api.ts'
import {SubmissionError} from '../server/submissions/submit-short.ts'
const id='a'.repeat(64),origin='https://clipzone.test',visitor=n=>n.toString(16).padStart(64,'0')
function setup(platform='YouTube',evidence={existence:'missing'}){const db=memory([['games/portal',{status:'active'}],['shorts/'+id,{platform,gameId:'portal',moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/28nFy4tGcwI',title:'Jogada',channelName:'Canal',reviewVersion:0}],['comments/preserved',{content:'Oi'}],['submissionLimits/preserved',{count:5}],['videoIdentities/'+id,{shortId:id}]]);let time=new Date('2026-10-25T12:00:00Z'),verifications=0;const deps={store:db.store,now:()=>time,verify:async()=>{verifications++;return evidence}};return {...db,deps,advance:ms=>{time=new Date(time.getTime()+ms)},get verifications(){return verifications},send:(n,signal='youtube-150')=>recordPlaybackFailure({shortId:id,signal},visitor(n),deps)}}
test('15 distinct eligible identities require current server proof; retries/concurrency do not inflate, data is preserved',async()=>{
 const f=setup();await Promise.all(Array.from({length:14},(_,i)=>f.send(i)));assert.equal(f.verifications,0);assert.equal(f.records.get('shorts/'+id).moderationStatus,'published')
 await Promise.all(Array.from({length:6},()=>f.send(13)));assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,14)
 const result=await f.send(14);assert.equal(result.hidden,true);assert.equal(f.verifications,1);assert.equal(f.records.get('shorts/'+id).moderationStatus,'pending');assert.equal(f.records.get('shorts/'+id).reviewVersion,1)
 assert.deepEqual(f.records.get('submissionLimits/preserved'),{count:5});assert.equal(f.records.get('comments/preserved').content,'Oi');assert.equal(f.records.get('videoIdentities/'+id).shortId,id)
 const events=[...f.records].filter(([key])=>key.startsWith('moderationLogs/'));assert.equal(events.length,1);assert.equal(events[0][1].eventVersion,2)
 // An administrator's restoration increments reviewVersion; old receipts cannot hide again.
 f.records.set('shorts/'+id,{...f.records.get('shorts/'+id),moderationStatus:'published',reviewVersion:2});const fresh=await f.send(14);assert.equal(fresh.hidden,false);assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,1)
})
test('manual/TikTok/Twitch and unknown provider verdicts only forward review; autoplay/network never hide',async()=>{
 for(const [platform,signal]of [['Twitch','manual'],['TikTok','tiktok-error']]){const f=setup(platform);await Promise.all(Array.from({length:15},(_,i)=>f.send(i,signal)));assert.equal(f.verifications,0);assert.equal(f.records.get('shorts/'+id).moderationStatus,'published');assert.equal(f.records.get('playbackSummaries/'+id).forwarded,true)}
 const f=setup('YouTube',{existence:'unknown',embedding:'unknown'});await Promise.all(Array.from({length:20},(_,i)=>f.send(i)));assert.equal(f.verifications,1);assert.equal(f.records.get('shorts/'+id).moderationStatus,'published')
 const context=setup();await context.send(1,'autoplay');assert.equal(context.records.has('playbackSummaries/'+id),false);for(let n=0;n<20;n++)await context.send(n,'network');assert.equal(context.records.get('playbackSummaries/'+id).eligibleCount,0);assert.equal(context.verifications,0);assert.equal([...context.records.keys()].some(k=>k.startsWith('moderationLogs/')),false)
})
test('window expires after 30 days, forged provider signal fails, corrupted counters fail closed',async()=>{
 const f=setup();await f.send(1,'manual');f.advance(playbackWindowMs);await f.send(1,'manual');assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,1)
 await assert.rejects(f.send(2,'tiktok-error'),/invalid-signal/);await assert.rejects(recordPlaybackFailure({shortId:id,signal:'manual',count:15},visitor(2),f.deps),/invalid-input/)
 const summary=f.records.get('playbackSummaries/'+id);f.records.set('playbackSummaries/'+id,{...summary,eligibleCount:Number.MAX_SAFE_INTEGER});await assert.rejects(f.send(3),/counter/)
})
test('network/key errors and stale verification cannot hide restored or changed content',async()=>{
 const f=setup();f.deps.verify=async()=>{throw Error('key unavailable')};for(let i=0;i<15;i++)await f.send(i);assert.equal(f.records.get('shorts/'+id).moderationStatus,'published')
 const stale=setup();stale.deps.verify=async()=>{stale.records.set('shorts/'+id,{...stale.records.get('shorts/'+id),reviewVersion:1});return {existence:'missing'}};for(let i=0;i<15;i++)await stale.send(i);assert.equal(stale.records.get('shorts/'+id).moderationStatus,'published')
})
test('HTTP enforces signed session, origin, schema, media type, size and independent abuse limit',async()=>{
 const f=setup(),deps={...f.deps,origin,resolveVisitor:async()=>visitor(1),checkAbuse:async()=>{}};const req=(body={shortId:id,signal:'manual'},headers={})=>new Request(origin+'/api/playback/failure',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
 assert.equal((await handlePlaybackFailure(new Request(origin),deps)).status,405);assert.equal((await handlePlaybackFailure(req(undefined,{origin:'https://evil.test'}),deps)).status,403);assert.equal((await handlePlaybackFailure(req(undefined,{'content-type':'text/plain'}),deps)).status,415)
 assert.equal((await handlePlaybackFailure(req(),{...deps,resolveVisitor:async()=>null})).status,401);assert.equal((await handlePlaybackFailure(req({shortId:id,signal:'manual',actor:'admin'}),deps)).status,400);assert.equal((await handlePlaybackFailure(req({x:'x'.repeat(9000)}),deps)).status,413)
 assert.equal((await handlePlaybackFailure(req(),{...deps,checkAbuse:async()=>{throw new SubmissionError('abuse-limit')}})).status,429);assert.equal((await handlePlaybackFailure(req(),deps)).status,200)
})
test('client coalesces simultaneous/reopened reports and retries only after failed receipt',async()=>{
 let calls=0;const send=createPlaybackFailureClient(async(path)=>{calls++;return path==='/api/session'?new Response(null,{status:204}):Response.json({received:true,counted:true})});assert.deepEqual(await Promise.all([send(id,'manual'),send(id,'manual')]),[true,true]);await send(id,'youtube-150');assert.equal(calls,2)
 let attempts=0;const failing=createPlaybackFailureClient(async()=>{attempts++;return new Response(null,{status:503})});assert.equal(await failing(id,'manual'),false);assert.equal(await failing(id,'manual'),false);assert.equal(attempts,2)
})
