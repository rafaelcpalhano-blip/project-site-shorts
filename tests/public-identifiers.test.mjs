import test from 'node:test'
import assert from 'node:assert/strict'
import {formatPublicIdentifier,preparePublicIdentifier} from '../server/identifiers/public-identifiers.ts'
test('jogos expandem sem reusar aliases; comentários usam faixas disjuntas de nove posições',()=>{
 assert.equal(formatPublicIdentifier('manual-game',0),'mn0000');assert.equal(formatPublicIdentifier('manual-game',10000),'mn10000')
 assert.equal(formatPublicIdentifier('comment',0),'co000000000');assert.equal(formatPublicIdentifier('comment',999999999),'co999999999');assert.equal(formatPublicIdentifier('comment',1000000000),'coA00000000');assert.equal(formatPublicIdentifier('comment',3600000000),'coAA0000000')
 assert.throws(()=>formatPublicIdentifier('comment',-1));assert.throws(()=>formatPublicIdentifier('comment',Number.MAX_SAFE_INTEGER))
})
test('reserva é transacional, leituras precedem writes e mapa existente nunca é sobrescrito',async()=>{
 const docs=new Map(),writes=[];const tx={get:async path=>{assert.equal(writes.length,0);return docs.get(path)??null},create:(p,d)=>writes.push([p,d]),set:(p,d)=>writes.push([p,d])}
 const first=await preparePublicIdentifier(tx,'manual-game','manual-original',new Date());assert.equal(first.publicId,'mn0000');assert.equal(writes.length,0);first.apply();assert.equal(writes.length,2);assert.equal(writes[0][1].internalId,'manual-original')
 docs.set('publicIdentifiers/mn0000',{internalId:'other'});writes.length=0;await assert.rejects(preparePublicIdentifier(tx,'manual-game','manual-original',new Date()),/conflict/);assert.equal(writes.length,0)
})
