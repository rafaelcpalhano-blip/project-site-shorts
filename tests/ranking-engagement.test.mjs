import test from 'node:test'
import assert from 'node:assert/strict'
import {emptyRankingMetric,prepareEngagement} from '../server/ranking/engagement.ts'
import {bootstrapRanking} from '../server/ranking/bootstrap.ts'
import {shortLike,likePath} from '../server/likes/short-likes.ts'
import {submitComment} from '../server/comments/submit-comment.ts'
import {reviewComment} from '../server/comments/review-comment.ts'
import {createRankingCursor} from '../server/ranking/cursor.ts'
import {orderedFeed} from '../server/http/ordered-feed.ts'
import {createOrderedFeedClient} from '../src/features/shorts/services/ordered-feed-api.ts'
const origin='https://clipzone.test',epoch='a'.repeat(32),visitor='b'.repeat(64)
function memory(ready=true){
 let clock=new Date('2026-10-21T12:00:00Z'),tail=Promise.resolve();const now=()=>new Date(clock),docs=new Map(),stats={writes:0}
 docs.set('games/game',{status:'active',officialName:'Jogo',createdAt:new Date(clock-86400000)})
 docs.set('shorts/s1',{gameId:'game',moderationStatus:'published',title:'Preservado',createdAt:new Date(clock-3600000),likeCount:0})
 if(ready){docs.set('rankingState/metrics',{version:1,ready:true,epoch});docs.set('rankingMetrics/s1',emptyRankingMetric('s1','game',now(),epoch))}
 const store={get:async p=>structuredClone(docs.get(p)??null),transact(work){const next=tail.then(async()=>{const writes=new Map();const result=await work({get:async p=>{assert.equal(writes.size,0,'reads before writes');return structuredClone(docs.get(p)??null)},set:(p,d)=>writes.set(p,d),create:(p,d)=>{assert.ok(!docs.has(p));writes.set(p,d)}});for(const[p,d]of writes){docs.set(p,d);stats.writes++}return result});tail=next.catch(()=>{});return next},rankingBootstrapPage:async collection=>({readTime:now().toISOString(),items:[...docs].filter(([p])=>p.startsWith(collection+'/')).map(([p,data])=>({id:p.split('/')[1],data:structuredClone(data)}))})}
 return {store,docs,now,stats,clock:value=>{clock=value}}
}
const metric=d=>d.docs.get('rankingMetrics/s1')
const like=(d,who,liked=true,revision=0)=>shortLike({shortId:'s1',liked,revision},who,d,true)
const comment=(d,content,who=visitor)=>submitComment({shortId:'s1',content,requestId:crypto.randomUUID()},who,d)
const signal=(d,n,kind='comment',identity=n.toString(16).padStart(64,'0'),active=true)=>d.store.transact(async tx=>(await prepareEngagement(tx,{shortId:'s1',gameId:'game',kind,identity,sourceId:'source'+n,at:d.now(),now:d.now(),active}))())
test('curtidas concorrentes respeitam cap 20 sem limitar contador; repetir não grava',async()=>{
 const d=memory();await Promise.all(Array.from({length:25},(_,i)=>like(d,i.toString(16).padStart(64,'0'))));assert.equal(d.docs.get('shorts/s1').likeCount,25);assert.equal(metric(d).likeContributors,20);assert.equal(metric(d).likeMass,20)
 const before=d.stats.writes;await like(d,'0'.repeat(64));assert.equal(d.stats.writes,before);assert.ok(![...d.docs.keys()].some(p=>p.startsWith('submissionLimits/')))
})
test('descurtir retira contribuição; reativar mantém data/peso e não recicla o cap',async()=>{
 const d=memory();await like(d,visitor);d.clock(new Date(d.now().getTime()+12*3600000));await like(d,visitor,false,1);assert.equal(metric(d).likeMass,0);await like(d,visitor,true,2);assert.equal(metric(d).likeMass,.5);assert.equal((d.docs.get(await likePath('s1',visitor))).createdAt.toISOString(),'2026-10-21T12:00:00.000Z')
})
test('comentários elegíveis têm cap 10/hora e um por identidade/dia sem analisar sentimento',async()=>{
 const d=memory();const a=await comment(d,'Essa jogada foi excelente'),b=await comment(d,'Não gostei dessa jogada');assert.equal(a.status,'approved');assert.equal(b.status,'approved');assert.equal(metric(d).commentContributors,1)
 for(let i=1;i<13;i++)await signal(d,i);assert.equal(metric(d).commentContributors,10);assert.equal(metric(d).commentMass,10)
})
test('cap gasto permanece gasto após remoção e dia UTC permite nova contribuição',async()=>{
 const d=memory();for(let i=0;i<10;i++)await signal(d,i);await signal(d,0,'comment','0'.repeat(64),false);assert.equal(metric(d).commentContributors,9);await signal(d,11);assert.equal(metric(d).commentContributors,9)
 d.clock(new Date('2026-10-22T12:00:00Z'));await signal(d,20,'comment','0'.repeat(64));assert.equal(metric(d).commentContributors,10)
})
test('triagem pendente/rejeição não pontua; aprovação/remoção/restauro conserva timestamp original',async()=>{
 const d=memory(),r=await comment(d,'Que merda de jogada');assert.equal(r.status,'pending');assert.equal(metric(d).commentMass,0)
 d.clock(new Date(d.now().getTime()+12*3600000));const review=(action,revision)=>reviewComment({commentId:r.id,action,revision,reason:'Decisão do teste'},'owner',d)
 await review('reject',0);assert.equal(metric(d).commentContributors,0);await review('approve',1);assert.equal(metric(d).commentMass,.5);await review('remove',2);assert.equal(metric(d).commentMass,0);await review('restore',3);assert.equal(metric(d).commentMass,.5)
})
test('métrica inválida reverte toda curtida e revisão; ausência do módulo conserva legado',async()=>{
 const d=memory();metric(d).likeMass=-1;const before=d.stats.writes;await assert.rejects(like(d,visitor),/invalid-metrics/);assert.equal(d.stats.writes,before);assert.equal(d.docs.get('shorts/s1').likeCount,0)
 const legacy=memory(false);await like(legacy,visitor);assert.equal(legacy.docs.get('shorts/s1').likeCount,1);assert.equal(metric(legacy),undefined)
})
test('bootstrap inspeciona sem escrever e falha antes de alterar histórico inconsistente',async()=>{
 const d=memory(false);d.docs.get('shorts/s1').likeCount=1;await assert.rejects(bootstrapRanking({...d,apply:true}),/like-count-mismatch/);assert.equal(d.stats.writes,0)
 d.docs.get('shorts/s1').likeCount=0;assert.equal((await bootstrapRanking(d)).shorts,1);assert.equal(d.stats.writes,0);const original=structuredClone(d.docs.get('shorts/s1'));await bootstrapRanking({...d,apply:true});assert.deepEqual(d.docs.get('shorts/s1'),original);assert.equal(metric(d).ready,true);await assert.rejects(bootstrapRanking({...d,apply:true}),/already-initialized/)
})
test('bootstrap importa apenas evidências com data original e sinaliza comentário sem recibo',async()=>{
 const d=memory(false);await like(d,visitor);const r=await comment(d,'Uma bela jogada');d.docs.set('comments/legacy',{shortId:'s1',content:'Sem recibo',createdAt:d.now(),moderationStatus:'approved'})
 d.clock(new Date(d.now().getTime()+12*3600000));const report=await bootstrapRanking({...d,apply:true});assert.equal(report.unverifiedComments,1);assert.equal(metric(d).likeMass,.5);assert.equal(metric(d).commentMass,.5);assert.equal(d.docs.get('comments/'+r.id).moderationStatus,'approved')
})
test('bootstrap interrompido não libera métricas; lease permite recomeçar sem duplicar contribuições',async()=>{
 const d=memory(false),base=d.store.transact;let calls=0;d.store.transact=work=>{if(++calls===2)throw Error('interrupted');return base(work)};await assert.rejects(bootstrapRanking({...d,apply:true}),/interrupted/);assert.equal(d.docs.get('rankingState/metrics').ready,false);d.store.transact=base;await assert.rejects(bootstrapRanking({...d,apply:true}),/bootstrap-busy/);d.clock(new Date(d.now().getTime()+300001));await bootstrapRanking({...d,apply:true});assert.equal(metric(d).likeContributors,0);assert.equal(d.docs.get('rankingState/metrics').ready,true)
})
test('cursor HMAC impede fabricação, outra origem e alteração de modo/tempo',async()=>{
 const codec=await createRankingCursor('a'.repeat(64),origin),other=await createRankingCursor('a'.repeat(64),'https://other.test'),d=memory(),raw={scope:'latest:*',readTime:d.now().toISOString(),time:d.now().toISOString(),id:'s1'},token=await codec.seal(raw);assert.deepEqual(await codec.open(token),raw)
 for(const value of [raw,token.slice(0,-1)+(token.endsWith('0')?'1':'0'),'v1x'+token.slice(3)])await assert.rejects(codec.open(value),/invalid-ranking-cursor/)
 await assert.rejects(other.open(token),/invalid-ranking-cursor/);d.store.rankingPage=()=>{throw Error('must-not-query')}
 await assert.rejects(orderedFeed({order:'likes',cursor:token},d.store,{cursor:codec,now:d.now}),e=>e.status===409)
 d.clock(new Date(d.now().getTime()+1800000));await assert.rejects(orderedFeed({cursor:token},d.store,{cursor:codec,now:d.now}),e=>e.status===409)
})
test('cliente ordenado valida DTO, propaga indisponibilidade e não repete consultas',async()=>{
 let calls=0;const ok={items:[],next:null,order:'latest',orderingAt:new Date().toISOString(),limited:false,candidatesRead:0,candidatesExamined:0};let body=ok,status=200
 const client=createOrderedFeedClient(async path=>{calls++;return path==='/api/session'?new Response(null,{status:204}):Response.json(body,{status})});assert.equal((await client('latest')).order,'latest');assert.equal(calls,2)
 body={...ok,candidatesRead:31};await assert.rejects(client('latest'),/inválida/);assert.equal(calls,4);body={error:'ranking-not-ready'};status=503;await assert.rejects(client('relevant'),/ainda não está disponível/);assert.equal(calls,6)
})
