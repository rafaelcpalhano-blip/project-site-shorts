import {test} from 'node:test'
import assert from 'node:assert/strict'
import {sequenceTarget,keyDirection,createWheelNavigation} from '../src/features/shorts/services/sequence-navigation.ts'
const items=Array.from({length:15},(_,index)=>({id:String(index),gameId:'game',title:'Vídeo '+index}))
test('navegação respeita exatamente a sequência recebida e os dois limites, sem circular',()=>{
 assert.equal(sequenceTarget(items,'0',-1),null);assert.equal(sequenceTarget(items,'14',1),null);assert.equal(sequenceTarget(items,'7',-1),items[6]);assert.equal(sequenceTarget(items,'7',1),items[8]);assert.equal(sequenceTarget([],'7',1),null);assert.equal(sequenceTarget(items,'ausente',1),null)
})
test('filtros e quatro ordens são preservados sem reconstruir ou ampliar consulta',()=>{
 for(const sequence of [items,[...items].reverse(),[items[4],items[8],items[1]],[items[11],items[3]]]){const before=structuredClone(sequence);for(let i=0;i<sequence.length-1;i++)assert.equal(sequenceTarget(sequence,sequence[i].id,1),sequence[i+1]);assert.deepEqual(sequence,before)}
})
test('setas só geram intenção fora da edição e sem repetição/modificadores',()=>{
 assert.equal(keyDirection({key:'ArrowLeft'},false),-1);assert.equal(keyDirection({key:'ArrowRight'},false),1);assert.equal(keyDirection({key:'ArrowRight'},true),null);assert.equal(keyDirection({key:'ArrowDown'},false),null)
 for(const flag of ['repeat','ctrlKey','altKey','metaKey','shiftKey'])assert.equal(keyDirection({key:'ArrowRight',[flag]:true},false),null)
})
test('um gesto contínuo de wheel dispara só uma troca, mesmo após inércia longa',()=>{
 let now=0;const wheel=createWheelNavigation(()=>now);assert.equal(wheel({deltaY:30}),null);now+=20;assert.equal(wheel({deltaY:60}),1);for(let i=0;i<30;i++){now+=100;assert.equal(wheel({deltaY:120}),null)}now+=301;assert.equal(wheel({deltaY:-100}),-1)
})
test('wheel respeita direção, unidades e ignora zoom, valores inválidos ou gesto horizontal',()=>{
 let now=0;const wheel=createWheelNavigation(()=>now);assert.equal(wheel({deltaY:40}),null);assert.equal(wheel({deltaY:-40}),null);assert.equal(wheel({deltaY:-40}),-1);now+=301;assert.equal(wheel({deltaY:5,deltaMode:1}),1);now+=301;assert.equal(wheel({deltaY:-1,deltaMode:2}),-1);now+=301;
 for(const event of [{deltaY:100,ctrlKey:true},{deltaY:100,metaKey:true},{deltaY:NaN},{deltaY:Infinity},{deltaY:30,deltaX:100}])assert.equal(wheel(event),null)
})
