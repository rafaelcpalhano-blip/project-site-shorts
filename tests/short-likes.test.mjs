import test from 'node:test'
import assert from 'node:assert/strict'
import {shortLike,likePath} from '../server/likes/short-likes.ts'
import {handleLike} from '../server/http/likes.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {createLikesClient} from '../src/features/likes/services/likes-api.ts'
import {createAttemptLimiter} from '../server/security/attempt-limit.ts'
import {cleanupLikes} from '../server/likes/retention.ts'
const visitor='a'.repeat(64),other='b'.repeat(64),origin='https://clipzone.test',now=()=>new Date('2026-10-21T12:00:00Z')
function memory(){
 const docs=new Map([['games/game',{status:'active',officialName:'Jogo'}],['shorts/s1',{gameId:'game',moderationStatus:'published',title:'Preservado',reviewVersion:7,createdAt:now()}]]);let tail=Promise.resolve();const stats={writes:0}
 const store={async scanLikeRecords(collection,after){return [...docs].filter(([p])=>p.startsWith(collection+'/')&&(!after||p.split('/')[1]>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([p,data])=>({id:p.split('/')[1],data:structuredClone(data)}))},transact(work){const next=tail.then(async()=>{const writes=new Map(),deletes=new Set();const result=await work({get:async p=>{assert.equal(writes.size+deletes.size,0,'reads before writes');return structuredClone(docs.get(p)??null)},set:(p,d)=>writes.set(p,d),create:(p,d)=>{assert.ok(!docs.has(p));writes.set(p,d)},delete:p=>deletes.add(p)});for(const [p,d]of writes){docs.set(p,d);stats.writes++}for(const p of deletes)docs.delete(p);return result});tail=next.catch(()=>{});return next}}
 return {store,docs,stats,now}
}
const set=(deps,liked,revision=0,who=visitor)=>shortLike({shortId:'s1',liked,revision},who,deps,true)
const state=deps=>shortLike({shortId:'s1'},visitor,deps)
test('legados iniciam em zero sem gravar; curtir/descurtir preserva título, revisão e data do short',async()=>{
 const deps=memory(),before=structuredClone(deps.docs.get('shorts/s1'));assert.deepEqual(await state(deps),{shortId:'s1',liked:false,revision:0,count:0});assert.equal(deps.stats.writes,0)
 assert.equal((await set(deps,true)).count,1);assert.deepEqual(await state(deps),{shortId:'s1',liked:true,revision:1,count:1});assert.equal((await set(deps,false,1)).count,0)
 assert.deepEqual(deps.docs.get('shorts/s1'),{...before,likeCount:0});assert.equal(deps.stats.writes,4)
})
test('requisições duplicadas simultâneas e visitantes diferentes mantêm uma contribuição por identidade',async()=>{
 const deps=memory(),results=await Promise.all([set(deps,true),set(deps,true),set(deps,true,0,other)])
 assert.equal((await state(deps)).count,2);assert.equal(deps.stats.writes,4);assert.equal(results[1].revision,1)
 const before=deps.stats.writes;await set(deps,true);assert.equal(deps.stats.writes,before)
})
test('revisão impede um retry atrasado de recontabilizar após descurtir; duplicata de estado não grava',async()=>{
 const deps=memory();await set(deps,true);await set(deps,false,1);await assert.rejects(set(deps,true,0),/stale-like/);assert.equal((await state(deps)).count,0);const writes=deps.stats.writes;await set(deps,false,0);assert.equal(deps.stats.writes,writes)
 await set(deps,true,2);const pair=deps.docs.get(await likePath('s1',visitor));assert.equal(pair.revision,3);assert.deepEqual(pair.createdAt,now());assert.equal(pair.visitorHash,undefined)
})
test('identificador privado muda por vídeo/visitante e não revela o hash de sessão',async()=>{
 const path=await likePath('s1',visitor);assert.notEqual(path,await likePath('s2',visitor));assert.notEqual(path,await likePath('s1',other));assert.ok(!path.includes(visitor));await assert.rejects(likePath('s1','forged'),/invalid-session/)
})
test('oculto, banido, pendente, removido e vínculos ausentes não aceitam curtida nem revelam estado',async()=>{
 for(const [collection,status]of [['games','hidden'],['games','banned'],['shorts','pending'],['shorts','removed']]){const deps=memory();deps.docs.get(collection+'/'+(collection==='games'?'game':'s1'))[collection==='games'?'status':'moderationStatus']=status;await assert.rejects(set(deps,true),/short-unavailable/);await assert.rejects(state(deps),/short-unavailable/);assert.equal(deps.stats.writes,0)}
 const deps=memory();deps.docs.delete('games/game');await assert.rejects(set(deps,true),/short-unavailable/)
})
test('incrementos enviados pelo cliente, tipos e contadores corrompidos falham sem escrita',async()=>{
 const deps=memory()
 for(const patch of [{count:200},{liked:'yes'},{shortId:'../private'},{revision:-1},{revision:Number.MAX_SAFE_INTEGER},{visitorHash:visitor}])await assert.rejects(shortLike({shortId:'s1',liked:true,revision:0,...patch},visitor,deps,true),/invalid-input/)
 for(const value of [-1,NaN,'1',null]){deps.docs.get('shorts/s1').likeCount=value;await assert.rejects(set(deps,true),/invalid-like-count/)}
 assert.equal(deps.stats.writes,0)
})
test('contador não fica negativo ou estoura; registro inválido não vira curtida nova',async()=>{
 const deps=memory();deps.docs.get('shorts/s1').likeCount=Number.MAX_SAFE_INTEGER;await assert.rejects(set(deps,true),/invalid-like-counter/)
 deps.docs.get('shorts/s1').likeCount=0;deps.docs.set(await likePath('s1',visitor),{shortId:'s1',liked:true,revision:1,createdAt:now(),changedAt:now()});await assert.rejects(set(deps,false,1),/invalid-like-count/)
 deps.docs.get(await likePath('s1',visitor)).shortId='other';await assert.rejects(state(deps),/invalid-like-record/);assert.equal(deps.stats.writes,0)
})
test('limite de 20 tentativas tem escopo separado e janela própria',async()=>{
 const deps=memory();let clock=now();const limit=createAttemptLimiter({...deps,now:()=>clock,maximum:20,windowMs:60000,scope:'like'})
 for(let n=0;n<20;n++)await limit(visitor);await assert.rejects(limit(visitor),/abuse-limit/)
 assert.equal(deps.docs.get('likeAttempts/'+visitor).count,20);assert.equal([...deps.docs.keys()].some(p=>p.startsWith('submissionLimits/')),false)
 clock=new Date(clock.getTime()+60000);await limit(visitor);assert.equal(deps.docs.get('likeAttempts/'+visitor).count,1)
})
test('HTTP exige origem, sessão assinada, JSON, tamanho limitado e não vaza falhas',async()=>{
 const deps=memory(),options={...deps,origin,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}},req=(body={},headers={})=>new Request(origin+'/api/likes/set',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})
 assert.equal((await handleLike(new Request(origin+'/api/likes/set'),options)).status,405)
 assert.equal((await handleLike(req({}, {Origin:'https://evil.test'}),options)).status,403);assert.equal((await handleLike(req({}, {'sec-fetch-site':'cross-site'}),options)).status,403)
 assert.equal((await handleLike(req({}, {'Content-Type':'text/plain'}),options)).status,415);assert.equal((await handleLike(req(),{...options,resolveVisitor:async()=>null})).status,401)
 assert.equal((await handleLike(req({extra:'x'.repeat(9000)}),options)).status,413)
 const response=await handleLike(req(),{...options,checkAbuse:async()=>{throw Error('private secret')}});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private'))
})
test('cliente e roteador integram cookie válido, atualização idempotente e isolamento da cota',async()=>{
 const deps=memory(),api=await createPublicApi({...deps,origin,visitorSecret:'ab'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}});let cookie=''
 const client=createLikesClient(async(path,options)=>{const response=await api(new Request(origin+path,{...options,headers:{...options.headers,Origin:origin,Cookie:cookie}}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response})
 const initial=await client.state('s1'),liked=await client.set(initial,true);assert.equal(liked.count,1);assert.equal((await client.set(initial,true)).count,1);assert.equal((await client.set(liked,false)).count,0);await assert.rejects(client.set(initial,true),/mudou/)
 assert.ok(![...deps.docs.keys()].some(p=>p.startsWith('submissionLimits/')))
 const forged=await api(new Request(origin+'/api/likes/state',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie+'forged'},body:JSON.stringify({shortId:'s1'})}));assert.equal(forged.status,401)
})
test('cliente não repete POST após resposta perdida e rejeita contagem forjada',async()=>{
 let calls=0;const client=createLikesClient(async path=>{calls++;if(path==='/api/session')return new Response(null,{status:204});throw Error('network failed')})
 await assert.rejects(client.set({shortId:'s1',liked:false,count:0,revision:0},true));assert.equal(calls,2)
 const bad=createLikesClient(async path=>path==='/api/session'?new Response(null,{status:204}):Response.json({shortId:'s1',liked:true,count:-1,revision:1}));await assert.rejects(bad.state('s1'),/inválida/)
})
test('retenção só remove descurtidos antigos, preserva ativos/recentes e seus contadores',async()=>{
 const deps=memory(),old=new Date(now().getTime()-91*86400000),ids=Array.from({length:4},(_,i)=>String(i).repeat(64))
 for(const [i,id]of ids.entries())deps.docs.set('shortLikes/'+id,{shortId:'s1',liked:i===1,revision:2,createdAt:old,changedAt:i===2?now():old})
 deps.docs.get('shortLikes/'+ids[3]).revision='invalid'
 const inspect=await cleanupLikes({...deps,collection:'shortLikes'});assert.equal(inspect.eligible,1);assert.equal(inspect.deleted,0)
 const applied=await cleanupLikes({...deps,collection:'shortLikes',apply:true});assert.equal(applied.deleted,1);assert.ok(deps.docs.has('shortLikes/'+ids[1]));assert.ok(deps.docs.has('shortLikes/'+ids[2]));assert.ok(deps.docs.has('shortLikes/'+ids[3]));assert.equal(deps.docs.get('shorts/s1').likeCount,undefined)
})
test('limpeza relê antes de excluir e preserva curtida reativada entre consulta e transação',async()=>{
 const deps=memory(),old=new Date(now().getTime()-91*86400000),path='shortLikes/'+'c'.repeat(64)
 deps.docs.set(path,{shortId:'s1',liked:false,revision:2,createdAt:old,changedAt:old});const scan=deps.store.scanLikeRecords
 deps.store.scanLikeRecords=async(...args)=>{const rows=await scan(...args);deps.docs.get(path).liked=true;deps.docs.get(path).changedAt=now();return rows}
 assert.equal((await cleanupLikes({...deps,collection:'shortLikes',apply:true})).deleted,0);assert.equal(deps.docs.get(path).liked,true)
})
test('retenção de tentativas pagina em até 30 sem apagar janela recente',async()=>{
 const deps=memory(),old=new Date(now().getTime()-91*86400000)
 for(let n=0;n<31;n++)deps.docs.set('likeAttempts/'+n.toString(16).padStart(64,'0'),{count:1,startsAt:old,updatedAt:old})
 const first=await cleanupLikes({...deps,collection:'likeAttempts',apply:true});assert.equal(first.examined,30);assert.equal(first.deleted,30);assert.ok(first.next)
 const last=await cleanupLikes({...deps,collection:'likeAttempts',after:first.next,apply:true});assert.equal(last.deleted,1);assert.equal(last.next,null)
 deps.docs.set('likeAttempts/'+visitor,{count:1,startsAt:now(),updatedAt:now()});assert.equal((await cleanupLikes({...deps,collection:'likeAttempts',apply:true})).deleted,0)
})
