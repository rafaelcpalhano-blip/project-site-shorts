import {test,before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {readFile} from 'node:fs/promises'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {bootstrapRanking} from '../../server/ranking/bootstrap.ts'
import {buildRankingGeneration,generationLimits} from '../../server/ranking/generation.ts'
import {readOrderedFeed} from '../../server/ranking/read-feed.ts'
import {shortLike,likePath} from '../../server/likes/short-likes.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {reviewComment} from '../../server/comments/review-comment.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createOrderedFeedClient} from '../../src/features/shorts/services/ordered-feed-api.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),now=()=>new Date(),options={store,now},visitor='b'.repeat(64),origin='https://clipzone.test';let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
beforeEach(async()=>{await env.clearFirestore()});after(async()=>{await env?.cleanup()})
async function seed(count=37){const at=now();await store.transact(async tx=>{
 for(const g of ['g1','g2'])tx.set('games/'+g,{officialName:g,source:'manual',status:'active',createdAt:new Date(at-300*3600000)})
 for(let i=0;i<count;i++)tx.set('shorts/s'+String(i).padStart(3,'0'),{gameId:i%2?'g2':'g1',title:'Jogada '+i,platform:'Twitch',platformVideoId:'IntegrationClip'+i,normalizedUrl:'https://clips.twitch.tv/IntegrationClip'+i,channelName:'Canal',moderationStatus:'published',createdAt:new Date(at-86400000-i*1000),likeCount:0})
})}
async function apiClient(){const api=await createPublicApi({...options,origin,visitorSecret:'a'.repeat(64),verify:async()=>{throw Error('unused')},maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true});let cookie='';const request=async(path,input={},headers={})=>{const result=await api(new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{}),...headers},body:JSON.stringify(input)}));cookie=result.headers.get('set-cookie')?.split(';')[0]??cookie;return result};return{request,client:createOrderedFeedClient((path,init)=>request(path,JSON.parse(init.body)))}}
test('bootstrap REST preserva fontes e importa datas/recibos reais; métricas e geração usam mesma epoch',async()=>{
 await seed(3);await shortLike({shortId:'s000',liked:true,revision:0},visitor,options,true);const r=await submitComment({shortId:'s000',content:'Uma bela jogada',requestId:crypto.randomUUID()},visitor,options)
 await store.transact(async tx=>tx.set('comments/legacy',{shortId:'s000',content:'Legado',createdAt:now(),moderationStatus:'approved'}))
 const before=await store.get('shorts/s000'),inspect=await bootstrapRanking(options);assert.equal(inspect.unverifiedComments,1);assert.equal(await store.get('rankingState/metrics'),null)
 await bootstrapRanking({...options,apply:true});assert.deepEqual(await store.get('shorts/s000'),before);const metric=await store.get('rankingMetrics/s000');assert.equal(metric.likeContributors,1);assert.equal(metric.commentContributors,1);assert.ok(metric.likeMass<=1&&metric.likeMass>.99);assert.equal((await store.get('comments/'+r.id)).moderationStatus,'approved')
 const generation=await buildRankingGeneration(options),current=await store.get('rankingState/current'),run=await store.get('rankingRuns/'+generation.generationId);assert.equal(current.metricsEpoch,metric.epoch);assert.ok(run.readCharge<generationLimits.readsPerRun);assert.equal((await store.get('rankingBudgets/'+now().toISOString().slice(0,10))).readsReserved,run.readCharge)
})
test('quatro ordens assinadas paginam 15 nos três escopos; moderar entre páginas não reexibe removidos',async()=>{
 await seed();await bootstrapRanking({...options,apply:true});await shortLike({shortId:'s032',liked:true,revision:0},visitor,options,true);await buildRankingGeneration(options);const {client,request}=await apiClient()
 for(const order of ['latest','oldest','likes','relevant'])for(const gameId of [undefined,'g1','g2']){const expected=[];let raw;do{const page=await readOrderedFeed({order,gameId,cursor:raw},options);expected.push(...page.items.map(r=>r.id));raw=page.next??undefined}while(raw);const actual=[];let cursor;do{const page=await client(order,gameId,cursor);assert.ok(page.items.length<=15);actual.push(...page.items.map(r=>r.id));cursor=page.next??undefined}while(cursor);assert.deepEqual(actual,expected);assert.equal(new Set(actual).size,actual.length)}
 const first=await client('latest');assert.ok(first.next);assert.equal((await request('/api/feed/ordered',{order:'oldest',cursor:first.next})).status,409);assert.equal((await request('/api/feed/ordered',{cursor:first.next.slice(0,-1)+'x'})).status,400)
 await store.transact(async tx=>{const row=await tx.get('shorts/s015');tx.set('shorts/s015',{...row,moderationStatus:'removed'})});const next=await client('latest',undefined,first.next);assert.ok(!next.items.some(r=>r.id==='s015'));assert.ok(next.items.every(r=>!first.items.some(old=>old.id===r.id)))
})
test('muitas fontes agora ocultas examinam só 30 e conservam continuação honesta',async()=>{
 await seed(40);await bootstrapRanking({...options,apply:true});await buildRankingGeneration(options);await store.transact(async tx=>{for(let i=0;i<35;i++)tx.set('shorts/s'+String(i).padStart(3,'0'),{moderationStatus:'removed',gameId:'g1'})})
 const page=await readOrderedFeed({order:'relevant'},options);assert.equal(page.items.length,0);assert.equal(page.candidatesExamined,30);assert.equal(page.limited,true);assert.ok(page.next);const second=await readOrderedFeed({order:'relevant',cursor:page.next},options);assert.equal(second.items.length,5);assert.equal(second.next,null)
})
test('mutações REST são atômicas: cap, data antiga após retenção e comentário removido/restaurado',async()=>{
 await seed(1);await bootstrapRanking({...options,apply:true});const results=await Promise.allSettled(Array.from({length:22},(_,i)=>shortLike({shortId:'s000',liked:true,revision:0},i.toString(16).padStart(64,'0'),options,true)))
 const accepted=results.filter(r=>r.status==='fulfilled').length;assert.equal((await store.get('shorts/s000')).likeCount,accepted);assert.equal((await store.get('rankingMetrics/s000')).likeContributors,Math.min(accepted,20))
 for(const [i,r]of results.entries())if(r.status==='rejected'){assert.equal(r.reason.code,'ABORTED');await shortLike({shortId:'s000',liked:true,revision:0},i.toString(16).padStart(64,'0'),options,true)}
 assert.equal((await store.get('shorts/s000')).likeCount,22);assert.equal((await store.get('rankingMetrics/s000')).likeContributors,20)
 const who='0'.repeat(64),path=await likePath('s000',who);await shortLike({shortId:'s000',liked:false,revision:1},who,options,true);await store.transact(async tx=>tx.delete(path));await shortLike({shortId:'s000',liked:true,revision:0},who,options,true);assert.equal((await store.get('rankingMetrics/s000')).likeContributors,20)
 const r=await submitComment({shortId:'s000',content:'Essa jogada foi muito boa',requestId:crypto.randomUUID()},visitor,options);assert.equal((await store.get('rankingMetrics/s000')).commentContributors,1)
 await reviewComment({commentId:r.id,action:'remove',reason:'Teste autorizado',revision:0},'owner',options);assert.equal((await store.get('rankingMetrics/s000')).commentContributors,0);await reviewComment({commentId:r.id,action:'restore',reason:'Teste autorizado',revision:1},'owner',options);assert.equal((await store.get('rankingMetrics/s000')).commentContributors,1)
})
test('novos shorts inicializam métricas sem afetar publicação, duplicatas ou cota cinco',async()=>{
 await seed(0);await bootstrapRanking({...options,apply:true});const deps={...options,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]})},input=n=>({url:'https://clips.twitch.tv/RankingNewVideo'+n,title:'Jogada comunitária '+n,gameId:'g1'})
 for(let n=0;n<5;n++){const r=await submitShort(input(n),visitor,deps),metric=await store.get('rankingMetrics/'+r.id);assert.equal(metric.ready,true);assert.equal(metric.likeMass,0);assert.equal(metric.epoch,(await store.get('rankingState/metrics')).epoch)}
 await assert.rejects(submitShort(input(5),visitor,deps),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,deps),e=>e.code==='duplicate-video')
})
test('API exige cookie/origem/corpo seguro e métricas privadas negam acesso SDK; epoch em troca invalida paginação',async()=>{
 await seed();await bootstrapRanking({...options,apply:true});await buildRankingGeneration(options);const {request}=await apiClient();assert.equal((await request('/api/feed/ordered',{})).status,401);await request('/api/session');assert.equal((await request('/api/feed/ordered',{}, {origin:'https://evil.test'})).status,403);assert.equal((await request('/api/feed/ordered',{order:'relevant',score:999})).status,400)
 const page=await(await request('/api/feed/ordered',{order:'relevant'})).json();assert.ok(page.next);await store.transact(async tx=>{const m=await tx.get('rankingState/metrics');tx.set('rankingState/metrics',{...m,ready:false})});assert.equal((await request('/api/feed/ordered',{order:'relevant',cursor:page.next})).status,503);assert.equal((await request('/api/feed/ordered',{order:'latest'})).status,200)
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('owner',{admin:true}).firestore()])for(const path of ['rankingSignals/probe','rankingHours/probe','rankingDays/probe','rankingState/metrics']){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{ready:true}))}
})
