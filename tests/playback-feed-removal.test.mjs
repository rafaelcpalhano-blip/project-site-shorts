import test from 'node:test'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {memory} from './helpers/refinements-store.mjs'
import {recordPlaybackFailure} from '../server/playback/record-failure.ts'
import {readFeed,readPublicShort} from '../server/public/read-content.ts'
import {reviewShort} from '../server/moderation/review-short.ts'
import {createYouTubeVerifier} from '../server/videos/youtube.ts'
const videoId='abcdefghijk',id=createHash('sha256').update('YouTube:'+videoId).digest('hex'),now=()=>new Date('2026-10-25T12:00:00Z'),visitor=n=>n.toString(16).padStart(64,'0')
// Fully isolated memory + simulated provider responses. No HTTP calls, real cookies or Firestore.
function fixture(embedding=false){
 const db=memory([['games/portal',{officialName:'Portal',status:'active'}],['shorts/'+id,{platform:'YouTube',platformVideoId:videoId,gameId:'portal',moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/'+videoId,title:'Vídeo fictício de teste',channelName:'Canal de teste',reviewVersion:0,commentCount:1,likeCount:2,createdAt:now()}],['comments/preserved',{shortId:id,content:'Comentário preservado'}],['videoIdentities/'+id,{shortId:id}],['submissionLimits/preserved',{count:5}]])
 db.store.get=async path=>structuredClone(db.records.get(path)??null)
 db.store.publicPage=async query=>[...db.records].filter(([path,data])=>path.startsWith('shorts/')&&data.moderationStatus==='published'&&(!query.parentId||data.gameId===query.parentId)).map(([path,data])=>({id:path.split('/')[1],data:structuredClone(data)})).slice(0,query.limit)
 let providerCalls=0
 const verify=createYouTubeVerifier({apiKey:'fixture-only-not-a-real-key',fetcher:async()=>{providerCalls++;return Response.json({items:[{id:videoId,status:{privacyStatus:'public',uploadStatus:'processed',embeddable:embedding},contentDetails:{duration:'PT30S'},snippet:{title:'Vídeo fictício de teste',channelTitle:'Canal de teste'}}]})}})
 const deps={store:db.store,now,verify}
 return {...db,deps,get providerCalls(){return providerCalls},send:(n,signal='youtube-150')=>recordPlaybackFailure({shortId:id,signal},visitor(n),deps),feed:()=>readFeed({},db.store)}
}
test('01 — com 14 identidades elegíveis o vídeo continua no feed',async()=>{
 const f=fixture();for(let n=1;n<=14;n++)await f.send(n);assert.ok((await f.feed()).items.some(row=>row.id===id));assert.equal(f.providerCalls,0);assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,14)
})
test('02 — a 15ª identidade oculta somente com confirmação negativa da fonte e preserva os dados',async()=>{
 const f=fixture();for(let n=1;n<=15;n++)await f.send(n);assert.equal((await f.feed()).items.length,0);await assert.rejects(readPublicShort({shortId:id},f.store),error=>error.status===404);assert.equal(f.records.get('shorts/'+id).moderationStatus,'pending');assert.equal(f.providerCalls,1);assert.equal(f.records.get('comments/preserved').content,'Comentário preservado');assert.equal(f.records.get('videoIdentities/'+id).shortId,id);assert.equal(f.records.get('submissionLimits/preserved').count,5);assert.equal([...f.records].filter(([path,data])=>path.startsWith('moderationLogs/')&&data.action==='playback-block').length,1)
})
test('03 — 30 tentativas da mesma identidade contam uma vez e mantêm o vídeo visível',async()=>{
 const f=fixture();for(let n=0;n<30;n++)await f.send(1);assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,1);assert.equal((await f.feed()).items.length,1);assert.equal(f.providerCalls,0)
})
test('04 — 15 relatos sem prova negativa encaminham para revisão e não retiram do feed',async()=>{
 const f=fixture(true);for(let n=1;n<=15;n++)await f.send(n);assert.equal((await f.feed()).items.length,1);assert.equal(f.records.get('playbackSummaries/'+id).forwarded,true);assert.equal([...f.records].filter(([path,data])=>path.startsWith('moderationLogs/')&&data.action==='playback-review').length,1)
})
test('05 — liberação administrativa real devolve o vídeo e descarta o ciclo antigo',async()=>{
 const f=fixture();for(let n=1;n<=15;n++)await f.send(n)
 const allowed=fixture(true).deps.verify
 await reviewShort({shortId:id,action:'approve',reason:'Conferido na origem e liberado para o teste',revision:1,reportCount:0},'fixture-admin',{store:f.store,now,verify:allowed})
 assert.equal((await f.feed()).items.length,1);assert.equal(f.records.get('shorts/'+id).reviewVersion,2);await f.send(1);assert.equal(f.records.get('playbackSummaries/'+id).eligibleCount,1);assert.equal((await f.feed()).items.length,1)
})
