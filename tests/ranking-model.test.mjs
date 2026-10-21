import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateRanking,evaluateMixedRanking,estimateSnapshotRefresh,estimatePage,fixtures,parameters} from '../scripts/experiments/ranking-model.mjs'
const video={publishedAt:300,gameCreatedAt:0,now:324},like=(n,at=323,identity='u'+n)=>({kind:'like',id:'l'+n,identity,at,accepted:true,active:true}),comment=(n,at=323,identity='u'+n)=>({kind:'comment',id:'c'+n,identity,at,accepted:true,active:true})
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,actual+' != '+expected)
test('publicação começa em 2 e perde metade do peso a cada 24h sem interações',()=>{close(evaluateRanking({...video,now:300}).score,2);close(evaluateRanking(video).score,1);close(evaluateRanking({...video,now:348}).score,0.5)})
test('bônus é pequeno, só qualifica nos primeiros sete dias do jogo e decai junto',()=>{
 const fresh={publishedAt:300,gameCreatedAt:299,now:300};close(evaluateRanking(fresh).score,2.3);close(evaluateRanking({...fresh,now:324}).score,1.15);assert.equal(evaluateRanking({...fresh,gameCreatedAt:132}).bonus,0)
})
test('curtidas recentes sobem rápido; pico antigo perde para descoberta recente',()=>{
 const old=evaluateRanking({publishedAt:100,gameCreatedAt:0,now:300,signals:Array.from({length:1000},(_,n)=>like(n,100))}),fresh=evaluateRanking({publishedAt:300,gameCreatedAt:0,now:300})
 assert.equal(old.admitted,20);assert.ok(old.score<fresh.score);assert.ok(evaluateRanking({...video,signals:[like(1)]}).score>evaluateRanking(video).score)
})
test('continuidade em várias horas supera o pico isolado limitado de uma hora',()=>{
 const scenarios=fixtures(),pulse=evaluateRanking(scenarios.find(v=>v.name.startsWith('Pico recente'))),continuous=evaluateRanking(scenarios.find(v=>v.name.startsWith('Interesse contínuo')))
 assert.ok(continuous.score>pulse.score);assert.equal(continuous.admitted,60)
})
test('duplicatas de ID não somam e uma identidade não curte várias vezes o mesmo short',()=>{
 close(evaluateRanking({...video,signals:[like(1),like(1)]}).score,evaluateRanking({...video,signals:[like(1)]}).score)
 const result=evaluateRanking({...video,signals:Array.from({length:500},(_,n)=>like(n,323,'same'))});assert.equal(result.admitted,1);assert.equal(result.suppressed.identity,499)
})
test('cap horário limita novas identidades, mas não promete impedir ataque distribuído',()=>{
 const scenarios=fixtures(),burst=evaluateRanking(scenarios.find(v=>v.name.startsWith('Tentativa: 500 identidades'))),distributed=evaluateRanking(scenarios.find(v=>v.name.startsWith('Ataque distribuído')))
 assert.equal(burst.admitted,20);assert.equal(burst.suppressed.hour,480);assert.equal(distributed.admitted,480);assert.ok(distributed.score>burst.score)
})
test('opiniões recebem o mesmo peso; rejeitados/pendentes não criam contribuição',()=>{
 const baseline=evaluateRanking(video),positive=evaluateRanking({...video,signals:[{...comment(1),opinion:'elogio'}]}),negative=evaluateRanking({...video,signals:[{...comment(1),opinion:'crítica'}]})
 close(positive.score,negative.score);close(evaluateRanking({...video,signals:[{...comment(1),accepted:false,active:false}]}).score,baseline.score)
})
test('comentários têm cap horário e uma contribuição por identidade/dia UTC',()=>{
 assert.equal(evaluateRanking({...video,signals:Array.from({length:30},(_,n)=>comment(n))}).admitted,10)
 assert.equal(evaluateRanking({...video,signals:[comment(1,322,'same'),comment(2,323,'same')]}).admitted,1)
 assert.equal(evaluateRanking({...video,now:350,signals:[comment(1,323,'same'),comment(2,347,'same')]}).admitted,2)
})
test('descurtir/remover retira peso, sem devolver vaga a spam; restaurar usa timestamp original',()=>{
 const signals=Array.from({length:21},(_,n)=>like(n)),removed=evaluateRanking({...video,signals:signals.map(s=>s.id==='l0'?{...s,active:false}:s)}),restored=evaluateRanking({...video,signals})
 assert.equal(removed.admitted,20);assert.equal(removed.active,19);assert.equal(removed.suppressed.hour,1);assert.equal(restored.active,20)
 const early=evaluateRanking({...video,signals:[like(1,300)]}),late=evaluateRanking({...video,now:348,signals:[like(1,300)]});close(late.score,early.score/2)
})
test('chave equivalente conserva a ordenação e independe do instante da consulta',()=>{
 const scenarios=fixtures(),first=scenarios.map(s=>evaluateRanking(s)),later=scenarios.map(s=>evaluateRanking({...s,now:s.now+72}))
 for(let i=0;i<first.length;i++){close(first[i].key,later[i].key);close(later[i].score,first[i].score/8)}
 const order=rows=>rows.map((value,id)=>({value,id})).sort((a,b)=>b.value-a.value).map(v=>v.id)
 assert.deepEqual(order(first.map(r=>r.key)),order(first.map(r=>r.score)))
})
test('logaritmos evitam overflow em timestamps grandes; nenhum score não finito',()=>{
 const offset=1e7,small=evaluateRanking({...video,signals:[like(1)]}),large=evaluateRanking({publishedAt:video.publishedAt+offset,gameCreatedAt:offset,now:video.now+offset,signals:[like(1,323+offset)]})
 close(large.score,small.score);assert.ok(Number.isFinite(large.key))
})
test('dados inválidos ou contraditórios falham em vez de fabricar score',()=>{
 for(const patch of [{now:NaN},{publishedAt:400},{gameCreatedAt:301},{signals:[like(1,500)]},{signals:[{...like(1),accepted:false}]},{signals:[like(1),{...like(1),active:false}]}])assert.throws(()=>evaluateRanking({...video,...patch}))
 assert.equal(parameters.halfLifeHours,24)
})
test('orçamento explicita os custos típicos, extremo e mínimo de consulta vazia',()=>{
 assert.equal(estimatePage({candidates:15,distinctGames:1}).documentReads,32);assert.equal(estimatePage({candidates:15,distinctGames:15}).documentReads,46);assert.equal(estimatePage({candidates:30,distinctGames:30}).documentReads,91);assert.equal(estimatePage({candidates:0,distinctGames:0}).documentReads,2)
 assert.equal(estimatePage({candidates:15,distinctGames:1,emptyQueries:1}).documentReads,33)
 for(const options of [{candidates:31},{candidates:1,distinctGames:2},{candidates:30,emptyQueries:1}])assert.throws(()=>estimatePage(options),/invalid-budget/)
})

test('falha demonstrada: decaimento comum conserva ordem e vantagem percentual do bônus para sempre',()=>{
 const a={publishedAt:300,gameCreatedAt:0,now:324,signals:Array.from({length:20},(_,n)=>like(n,300))},b={publishedAt:324,gameCreatedAt:0,now:324}
 assert.ok(evaluateRanking(a).score>evaluateRanking(b).score);assert.ok(evaluateRanking({...a,now:396}).score>evaluateRanking({...b,now:396}).score)
 const ratio=now=>evaluateRanking({publishedAt:300,gameCreatedAt:299,now}).score/evaluateRanking({publishedAt:300,gameCreatedAt:0,now}).score
 close(ratio(300),1.15);close(ratio(540),1.15)
})
test('variante corrige o pico/bônus, mas não oferece chave constante válida sem atualização por tempo',()=>{
 const a={publishedAt:300,gameCreatedAt:0,now:324,signals:Array.from({length:20},(_,n)=>like(n,300))},b={publishedAt:324,gameCreatedAt:0,now:324}
 assert.ok(evaluateMixedRanking(a).score>evaluateMixedRanking(b).score);assert.ok(evaluateMixedRanking({...a,now:396}).score<evaluateMixedRanking({...b,now:396}).score)
 assert.equal(evaluateMixedRanking(a).key,null)
 const ratio=now=>evaluateMixedRanking({publishedAt:300,gameCreatedAt:299,now}).score/evaluateMixedRanking({publishedAt:300,gameCreatedAt:0,now}).score
 close(ratio(300),1.15);assert.ok(ratio(324)<1.02)
})
test('gerações completas explicitam consumo antes de escolher frequência operacional',()=>{
 assert.deepEqual(estimateSnapshotRefresh({videos:100}),{videos:100,generationsPerDay:24,minimumReads:2400,minimumWrites:2424,steadyStateDeletes:2400})
 assert.equal(estimateSnapshotRefresh({videos:1000}).minimumWrites,24024);assert.equal(estimateSnapshotRefresh({videos:100,generationsPerDay:96}).minimumWrites,9696)
 assert.throws(()=>estimateSnapshotRefresh({videos:100,generationsPerDay:0}),/invalid-refresh-budget/)
})
