import test from 'node:test'
import assert from 'node:assert/strict'
import {createPublicApi} from '../server/http/public-api.ts'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {restFixture} from './helpers/portable-rest-fixture.ts'
import {createOrderedFeedClient,feedOrderLabels,normalizeFeedOrder} from '../src/features/shorts/services/ordered-feed-api.ts'
import {withoutCompositeRanking} from '../server/ranking/release-store.ts'
import {reviewComment} from '../server/comments/review-comment.ts'
const origin='https://clipzone.test',now=()=>new Date('2026-10-28T12:00:00Z')
async function fixture(){
 const docs=new Map([['rankingState/metrics',{version:-1,ready:true,epoch:'a'.repeat(32)}],['rankingMetrics/s000',{privateLegacy:true}],['rankingSignals/legacy',{privateLegacy:true}]])
 for(let n=0;n<3;n++)docs.set('games/g'+n,{officialName:'Game '+n,status:'active',source:'manual',createdAt:new Date(now()-3*86400000)})
 for(let n=0;n<37;n++){const id='s'+String(n).padStart(3,'0');docs.set('shorts/'+id,{title:'Clip '+n,platform:'Twitch',platformVideoId:'ReleaseClip'+n,normalizedUrl:'https://clips.twitch.tv/ReleaseClip'+n,gameId:'g'+n%3,createdAt:new Date(now()-86400000+n*1000),moderationStatus:'published',likeCount:n%4,commentCount:0})}
 const f=restFixture(docs,now),calls=[]
 const fetcher=async(url,init)=>{const body=JSON.parse(init.body);for(const name of body.documents??[])assert.ok(!name.includes('/documents/ranking'),'retired metrics must not be read');for(const w of body.writes??[])assert.ok(!String(w.update?.name??w.delete).includes('/documents/ranking'),'retired metrics must not be written');calls.push({url:String(url),body});return f.fetcher(url,init)}
 const store=createRestStore({projectId:'clipzone-db02a',accessToken:async()=>'fixture-only',fetcher,lazyTransactions:true}),verifyCalls=[]
 const api=await createPublicApi({origin,store,now,visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async input=>{verifyCalls.push(input);return {existence:'confirmed',shortFormat:'confirmed',gameMatch:'confirmed',moderation:'clear',flags:[]}}})
 let cookie='';const request=async(path,body={},extra={})=>{const r=await api(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(body)}));cookie=r.headers.get('set-cookie')?.split(';')[0]??cookie;return r}
 const privateBefore=structuredClone([...f.docs].filter(([p])=>p.startsWith('ranking')))
 return {f,store,request,calls,privateBefore,verifyCalls,client:createOrderedFeedClient(async(path,init)=>{const r=await request(path,JSON.parse(init.body));if(!r.ok)assert.fail(path+' '+r.status+' '+await r.clone().text());return r})}
}
const assertPrivate=d=>assert.deepEqual([...d.f.docs].filter(([p])=>p.startsWith('ranking')),d.privateBefore)
test('public orders are only latest, oldest and likes; retired contexts migrate to likes',async()=>{
 assert.deepEqual(Object.keys(feedOrderLabels),['latest','oldest','likes']);assert.equal(normalizeFeedOrder('relevant'),'likes');assert.equal(normalizeFeedOrder('likes'),'likes');assert.equal(normalizeFeedOrder('oldest'),'oldest');assert.equal(normalizeFeedOrder(null),'latest')
 let calls=0;const client=createOrderedFeedClient(async()=>{calls++;throw Error('not-called')});await assert.rejects(client('relevant'),/Ordenação inválida/);assert.equal(calls,0)
})
test('likes order paginates and filters without requiring or reading any ranking generation',async()=>{
 const d=await fixture();await d.request('/api/session');for(const gameId of [undefined,'g1']){const actual=[];let cursor;do{const page=await d.client('likes',gameId,cursor);actual.push(...page.items);cursor=page.next??undefined}while(cursor)
 const expected=[...d.f.docs].filter(([p,v])=>p.startsWith('shorts/')&&(!gameId||v.gameId===gameId)).map(([p,v])=>({id:p.slice(7),...v})).sort((a,b)=>b.likeCount-a.likeCount||b.createdAt-a.createdAt||(a.id<b.id?1:-1));assert.deepEqual(actual.map(v=>v.id),expected.map(v=>v.id));assert.equal(new Set(actual.map(v=>v.id)).size,actual.length)}assertPrivate(d)
})
test('retired public requests are refused before cursor or ranking lookup and retain session/origin guards',async()=>{
 const d=await fixture();assert.equal((await d.request('/api/feed/ordered',{order:'likes'})).status,401);await d.request('/api/session')
 assert.equal((await d.request('/api/feed/ordered',{order:'likes'},{Origin:'https://evil.test'})).status,403)
 const r=await d.request('/api/feed/ordered',{order:'relevant',cursor:'not-a-valid-cursor'});assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:'invalid-ranking-input'});assertPrivate(d)
})
test('like/unlike keeps counts and revisions while legacy relevance metrics remain untouched',async()=>{
 const d=await fixture();await d.request('/api/session');let r=await d.request('/api/likes/set',{shortId:'s000',liked:true,revision:0});assert.equal(r.status,200);assert.equal(d.f.docs.get('shorts/s000').likeCount,1)
 assert.equal((await d.request('/api/likes/set',{shortId:'s000',liked:false,revision:0})).status,409)
 r=await d.request('/api/likes/set',{shortId:'s000',liked:false,revision:1});assert.equal(r.status,200);assert.equal(d.f.docs.get('shorts/s000').likeCount,0);assertPrivate(d)
})
test('comment publication and moderation keep public counts without feeding retired metrics',async()=>{
 const d=await fixture();await d.request('/api/session');const r=await d.request('/api/comments',{shortId:'s000',content:'Uma bela jogada para compartilhar',requestId:crypto.randomUUID()});assert.equal(r.status,201);const result=await r.json();assert.equal(d.f.docs.get('shorts/s000').commentCount,1)
 await reviewComment({commentId:result.id,action:'remove',revision:0,reason:'Fixture review'},'owner',{store:withoutCompositeRanking(d.store),now});assert.equal(d.f.docs.get('shorts/s000').commentCount,0);assertPrivate(d)
})
test('publishing a verified short keeps quota and duplicate prevention without creating rank metrics',async()=>{
 const d=await fixture();await d.request('/api/session');const body={url:'https://clips.twitch.tv/ReleaseVerifiedNewClip',title:'Uma jogada nova',gameId:'g1'},r=await d.request('/api/shorts',body);assert.equal(r.status,201);const result=await r.json();assert.equal(d.f.docs.get('shorts/'+result.id).likeCount,0);assert.equal((await d.request('/api/shorts',body)).status,409);assert.ok(d.verifyCalls.length>=1);assertPrivate(d)
})
