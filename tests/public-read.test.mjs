import test from 'node:test'
import assert from 'node:assert/strict'
import { readFeed, readComments, readPublicShort } from '../server/public/read-content.ts'
import { handlePublicRead } from '../server/http/public-read.ts'
import { createPublicApi } from '../server/http/public-api.ts'
import { createPublicReadClient } from '../src/lib/firebase/public-read-api.ts'
import { submitComment } from '../server/comments/submit-comment.ts'
import { reportShort } from '../server/reports/report-short.ts'
import { reviewComment, parseCommentReview } from '../server/comments/review-comment.ts'
const origin='https://clipzone.test',visitor='a'.repeat(64),now=()=>new Date('2026-10-21T12:00:00Z')
const row=(n,gameId='portal')=>({id:'s'+String(n).padStart(3,'0'),data:{gameId,platform:'Twitch',platformVideoId:'PublicClip'+n,normalizedUrl:'https://clips.twitch.tv/PublicClip'+n,title:'Jogada '+n,channelName:'Canal',moderationStatus:'published',createdAt:new Date(1700000000000+n*1000),privateFlag:'never-public'}})
function memory(rows=[]) {
 const docs=new Map([['games/portal',{status:'active',officialName:'Portal',privateFlag:'secret'}],['games/hidden',{status:'banned',officialName:'Não revelar'}],...rows.map(r=>['shorts/'+r.id,r.data])]);const stats={candidates:0,games:0,writes:0}
 const get=async p=>{if(p.startsWith('games/'))stats.games++;return structuredClone(docs.get(p)??null)}
 const store={get,async publicPage(q){let rows=[...docs].filter(([p,d])=>p.startsWith(q.kind+'/')&&d.moderationStatus===(q.kind==='shorts'?'published':'approved')&&(!q.parentId||d[q.kind==='shorts'?'gameId':'shortId']===q.parentId)).map(([p,data])=>({id:p.split('/')[1],data})).sort((a,b)=>b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id));if(q.cursor)rows=rows.filter(r=>r.data.createdAt.toISOString()<q.cursor.time||r.data.createdAt.toISOString()===q.cursor.time&&r.id<q.cursor.id);rows=rows.slice(0,q.limit);if(q.kind==='shorts')stats.candidates+=rows.length;return structuredClone(rows)},async transact(work){const writes=[];const result=await work({get,create:(p,d)=>writes.push([p,d]),set:(p,d)=>writes.push([p,d])});for(const [p,d]of writes){docs.set(p,d);stats.writes++}return result}}
 return {store,docs,stats}
}
test('feed pagina em 15, respeita cronologia/filtro e não transmite campos privados',async()=>{
 const {store,stats}=memory(Array.from({length:34},(_,n)=>row(n)))
 const ids=[];let cursor
 do{const before=stats.candidates,page=await readFeed(cursor?{cursor}:{},store);assert.ok(page.items.length<=15);assert.ok(stats.candidates-before<=30);ids.push(...page.items.map(v=>v.id));cursor=page.next}while(cursor)
 assert.equal(ids.length,34);assert.equal(new Set(ids).size,34);assert.equal(ids[0],'s033');assert.equal(ids.at(-1),'s000')
 const filtered=await readFeed({gameId:'portal'},store);assert.equal(filtered.items.length,15);assert.equal(stats.writes,0)
 assert.ok(!JSON.stringify(filtered).includes('privateFlag'));assert.equal(filtered.items[0].gameName,'Portal')
})
test('30 candidatos ocultos geram continuação sem alegar fim; jogo é lido uma vez por chamada',async()=>{
 const rows=[row(0),...Array.from({length:30},(_,n)=>row(n+1,'hidden'))],{store,stats}=memory(rows)
 const first=await readFeed({},store);assert.equal(first.items.length,0);assert.equal(first.limited,true);assert.ok(first.next);assert.equal(first.candidatesRead,30);assert.equal(stats.games,1)
 const second=await readFeed({cursor:first.next},store);assert.deepEqual(second.items.map(v=>v.id),['s000']);assert.equal(second.next,null)
 const before=stats.candidates;assert.equal((await readFeed({gameId:'hidden'},store)).next,null);assert.equal(stats.candidates,before)
})
test('ocultar/banir e restaurar jogo controla detalhe/comentários sem alterar vídeos removidos ou dados',async()=>{
 const {store,docs}=memory([row(0)]);docs.set('comments/c1',{shortId:'s000',moderationStatus:'approved',content:'Boa!',createdAt:now(),privateFlag:'secret'})
 assert.equal((await readComments({shortId:'s000'},store)).items.length,1)
 for(const status of ['hidden','banned','inactive','provisional']){docs.get('games/portal').status=status;assert.equal((await readFeed({},store)).items.length,0);await assert.rejects(readPublicShort({shortId:'s000'},store),/short-unavailable/);await assert.rejects(readComments({shortId:'s000'},store),/short-unavailable/)}
 docs.get('games/portal').status='active';assert.equal((await readPublicShort({shortId:'s000'},store)).id,'s000');docs.get('shorts/s000').moderationStatus='removed';assert.equal((await readFeed({},store)).items.length,0)
 assert.equal(docs.get('comments/c1').content,'Boa!')
})
test('comentários paginam 20, cursor vincula short e feed vincula jogo, corpo não controla consultas',async()=>{
 const {store,docs}=memory([row(0)]);for(let n=0;n<23;n++)docs.set('comments/c'+String(n).padStart(2,'0'),{shortId:'s000',moderationStatus:n===0?'pending':'approved',content:'Texto '+n,createdAt:now()})
 const one=await readComments({shortId:'s000'},store),two=await readComments({shortId:'s000',cursor:one.next},store);assert.equal(one.items.length,20);assert.equal(two.items.length,2);assert.equal(two.next,null)
 await assert.rejects(readComments({shortId:'s001',cursor:one.next},store),/invalid-input/)
 const first=await readFeed({},memory(Array.from({length:20},(_,n)=>row(n))).store)
 for(const input of [{gameId:'portal',cursor:first.next},{gameId:'../private'},{limit:999},{order:'relevance'},{cursor:{...first.next,id:'../secret'}}])await assert.rejects(readFeed(input,store),/invalid-input/)
})
test('jogo indisponível impede comentários, denúncias e restauração de comentário sem gravar',async()=>{
 const sid='b'.repeat(64),record=row(0);record.id=sid;const {store,docs,stats}=memory([record]);docs.get('games/portal').status='banned'
 await assert.rejects(submitComment({shortId:sid,content:'Boa jogada',requestId:crypto.randomUUID()},visitor,{store,now}),/short-unavailable/)
 await assert.rejects(reportShort({shortId:sid,reason:'spam'},visitor,{store,now}),/short-unavailable/)
 docs.set('comments/c1',{shortId:sid,content:'Boa jogada',moderationStatus:'removed',reviewVersion:1})
 await assert.rejects(reviewComment(parseCommentReview({commentId:'c1',action:'restore',revision:1,reason:'Revisão administrativa'}),'owner',{store,now}),/short-unavailable/)
 assert.equal(stats.writes,0)
})
test('HTTP exige origem, sessão, JSON e corpo limitado; falhas privadas não vazam',async()=>{
 const {store}=memory([row(0)]),deps={origin,store,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}}
 const req=(body={},headers={})=>new Request(origin+'/api/feed',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
 assert.equal((await handlePublicRead(new Request(origin+'/api/feed'),deps)).status,405)
 assert.equal((await handlePublicRead(req({},{origin:'https://evil.test'}),deps)).status,403)
 assert.equal((await handlePublicRead(req({}, {'content-type':'text/plain'}),deps)).status,415)
 assert.equal((await handlePublicRead(req(),{...deps,resolveVisitor:async()=>null})).status,401)
 assert.equal((await handlePublicRead(req({gameId:'x'.repeat(9000)}),deps)).status,413)
 const bad=await handlePublicRead(req(),{...deps,store:{get:async()=>{throw Error('PRIVATE')},publicPage:async()=>{throw Error('PRIVATE')}}});assert.equal(bad.status,503);assert.equal(JSON.stringify(await bad.json()).includes('PRIVATE'),false)
})
test('cliente usa API assinada, limite de leitura próprio e não consome cota de publicação',async()=>{
 const {store,docs}=memory([row(0)]),api=await createPublicApi({origin,store,now,visitorSecret:'ab'.repeat(32),maximumAttempts:2,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}});let cookie=''
 const client=createPublicReadClient(async(path,options)=>{const response=await api(new Request(origin+path,{...options,headers:{...options.headers,origin,cookie}}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response})
 assert.equal((await client.listShorts()).items[0].id,'s000');assert.equal((await client.getShort('s000')).id,'s000');await assert.rejects(client.listShorts(),/Muitas consultas/)
 assert.ok([...docs.keys()].some(p=>p.startsWith('publicReadAttempts/')));assert.ok(![...docs.keys()].some(p=>p.startsWith('submissionLimits/')))
})
test('cliente rejeita resposta e cursor incompatíveis, não repete falha automaticamente',async()=>{
 let calls=0;const client=createPublicReadClient(async path=>{calls++;return path==='/api/session'?new Response(null,{status:204}):Response.json({error:'secret'},{status:503})})
 await assert.rejects(client.listShorts(),/Não foi possível/);assert.equal(calls,2)
 const forged=createPublicReadClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({items:[],next:{id:'s000',time:now().toISOString(),scope:'shorts:other'},limited:false,candidatesRead:0,candidatesExamined:0}))
 await assert.rejects(forged.listShorts(),/invalid-input/)
})


test('total de comentários vem do short sem consultas de contagem por card e não é o tamanho da página',async()=>{
 const source=row(0);source.data.commentCount=25
 const {store,stats}=memory([source])
 const feed=await readFeed({},store);assert.equal(feed.items[0].commentCount,25);assert.equal(stats.candidates,1)
 const detail=await readComments({shortId:'s000'},store);assert.equal(detail.total,25);assert.equal(detail.items.length,0)
 source.data.commentCount=-1
 const invalid=memory([source]);await assert.rejects(readFeed({},invalid.store),/invalid-comment-count/)
})
