import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {parseReview,reviewShort} from '../server/moderation/review-short.ts'
import {loadDetail} from '../server/moderation/queue.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {AdminAuthError} from '../server/auth/firebase-admin.ts'
const id=createHash('sha256').update('Twitch:BlockClip').digest('hex'),visitor='b'.repeat(64),now=()=>new Date('2026-10-22T12:00:00Z'),origin='https://clipzone.test'
function memory(){const docs=new Map(),store={get:async p=>structuredClone(docs.get(p)??null),query:async q=>[...docs].filter(([p,d])=>p.startsWith(q.collection+'/')&&d[q.filter.field]===q.filter.value).slice(0,q.limit).map(([p,data])=>({id:p.split('/')[1],data:structuredClone(data)})),transact:async work=>{const changes=[];const value=await work({get:async p=>{assert.equal(changes.length,0);return structuredClone(docs.get(p)??null)},set:(p,d)=>changes.push([p,d]),create:(p,d)=>changes.push([p,d])});for(const[p,d]of changes)docs.set(p,d);return value}};docs.set('shorts/'+id,{title:'Jogada',channelName:'Canal',normalizedUrl:'https://clips.twitch.tv/BlockClip',platform:'Twitch',platformVideoId:'BlockClip',gameId:'game',moderationStatus:'published',createdAt:now(),likeCount:3});docs.set('videoIdentities/'+id,{shortId:id});docs.set('submissionOwners/'+id,{visitorHash:visitor});docs.set('submissionLimits/'+visitor+'-2026-10-22',{count:5});docs.set('games/game',{officialName:'Jogo',status:'active'});return {docs,store,now,verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})}}
const input=(action,revision=0,reportCount=0)=>parseReview({shortId:id,action,revision,reportCount,reason:'Decisão administrativa de teste'})
test('bloqueio é temporário, auditado e mantém identidade/contadores/cota; liberação não cobra novamente',async()=>{
 const d=memory(),before=structuredClone(d.docs.get('shorts/'+id));assert.equal((await reviewShort(input('block'),'owner',d)).status,'pending');assert.equal((await loadDetail({shortId:id},d.store)).short.blocked,true);assert.equal(d.docs.get('shorts/'+id).likeCount,3);assert.equal(d.docs.get('videoIdentities/'+id).shortId,id);assert.equal((await reviewShort(input('approve',1),'owner',d)).status,'published');assert.equal(d.docs.get('shorts/'+id).administrativeBlock,undefined);assert.equal(d.docs.get('submissionLimits/'+visitor+'-2026-10-22').count,5);assert.deepEqual(d.docs.get('shorts/'+id).createdAt,before.createdAt)
 const logs=[...d.docs].filter(([p])=>p.startsWith('moderationLogs/')).map(([,v])=>v);assert.equal(logs.length,2);assert.equal(logs[0].actor,'owner');assert.equal(logs[0].action,'block');assert.equal(logs[0].previousStatus,'published');assert.equal(logs[0].resultingStatus,'pending');assert.ok(logs[0].createdAt instanceof Date)
})
test('excluir/restaurar bloqueado conserva fila e elegibilidade da liberação sem duplicar registro',async()=>{
 const d=memory();await reviewShort(input('block'),'owner',d);await reviewShort(input('remove',1),'owner',d);assert.equal((await reviewShort(input('restore',2),'owner',d)).status,'pending');await reviewShort(input('approve',3),'owner',d);assert.equal(d.docs.get('shorts/'+id).moderationStatus,'published');assert.equal(d.docs.get('submissionLimits/'+visitor+'-2026-10-22').count,5);assert.equal([...d.docs.keys()].filter(p=>p.startsWith('shorts/')).length,1)
})
test('arquivar denúncias de bloqueado não perde isenção; pendente comum continua sujeito à cota',async()=>{
 const d=memory();await reviewShort(input('block'),'owner',d);d.docs.set('reportSummaries/'+id,{count:1,status:'pending'});await reviewShort(input('dismiss',1,1),'owner',d);await reviewShort(input('approve',2,1),'owner',d);assert.equal(d.docs.get('submissionLimits/'+visitor+'-2026-10-22').count,5)
 const normal=memory();normal.docs.get('shorts/'+id).moderationStatus='pending';await assert.rejects(reviewShort(input('approve'),'owner',normal),e=>e.message==='daily-limit');assert.equal(normal.docs.get('shorts/'+id).moderationStatus,'pending')
})
test('concorrência/repetição, bloqueio de pendente e verificação inconclusiva falham sem mutação adicional',async()=>{
 const d=memory();await reviewShort(input('block'),'owner',d);const before=structuredClone(d.docs);await assert.rejects(reviewShort(input('block'),'owner',d),/stale-review/);await assert.rejects(reviewShort(input('block',1),'owner',d),/stale-review/);await assert.rejects(reviewShort(input('approve',1),'owner',{...d,verify:async()=>({existence:'unknown'})}),/verification-incomplete/);assert.deepEqual(d.docs,before)
})
test('bloqueio por HTTP continua exigindo origem, sessão, UID/TOTP validado e motivo',async()=>{
 const d=memory(),api=await createPublicApi({...d,origin,visitorSecret:'a'.repeat(64),maximumAttempts:20,attemptWindowMs:60000,checkAbuse:async()=>{},allowSessionIssuance:async()=>true,admin:{publicConfig:{apiKey:'test',authDomain:'test',projectId:'test',appId:'test'},authorize:async request=>{if(request.headers.get('authorization')!=='Bearer allowed')throw new AdminAuthError('totp-required',403);return {uid:'owner',email:'owner@example.test'}}}}),post=(path,body={},headers={})=>api(new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})),cookie=(await post('/api/session')).headers.get('set-cookie').split(';')[0]
 assert.equal((await post('/api/admin/review',input('block'),{cookie})).status,403);assert.equal(d.docs.get('shorts/'+id).moderationStatus,'published');assert.equal((await post('/api/admin/review',{...input('block'),reason:'x'},{cookie,Authorization:'Bearer allowed'})).status,400);assert.equal((await post('/api/admin/review',input('block'),{cookie,Authorization:'Bearer allowed',origin:'https://evil.test'})).status,403);assert.equal((await post('/api/admin/review',input('block'),{cookie,Authorization:'Bearer allowed'})).status,200)
})

test('marcador de publicação anterior não é aceito do cliente nem autoriza estado corrompido',async()=>{
 assert.throws(()=>parseReview({...input('approve'),administrativeBlock:{previousStatus:'published'}}),/invalid-input/)
 const d=memory();d.docs.get('shorts/'+id).moderationStatus='pending';d.docs.get('shorts/'+id).administrativeBlock={previousStatus:'published',blockedAt:'forged'};const before=structuredClone(d.docs);await assert.rejects(reviewShort(input('approve'),'owner',d),/invalid-block-state/);assert.deepEqual(d.docs,before)
})
