import test from 'node:test'
import assert from 'node:assert/strict'
import {memory} from './helpers/refinements-store.mjs'
import {assignLegacyManualGameIdentifier} from '../server/identifiers/legacy-manual-games.ts'
const now=()=>new Date('2026-10-25T12:00:00Z')
test('concurrent legacy assignments reserve unique aliases, replay is read-only, fields and links survive',async()=>{
 const game={source:'manual',officialName:'Exjanitor',status:'active',createdAt:now(),reviewVersion:4,description:'Original'},f=memory([['games/manual-one',game],['games/manual-two',{...game,officialName:'Outro'}],['shorts/short',{gameId:'manual-one'}]]),deps={store:f.store,now}
 const results=await Promise.all(['manual-one','manual-one','manual-two'].map(id=>assignLegacyManualGameIdentifier(id,deps)));assert.equal(results.filter(r=>r.changed).length,2);assert.equal(new Set(results.map(r=>r.publicId)).size,2);assert.equal(f.records.get('publicIdentifierCounters/manual-game').next,2)
 const saved={...f.records.get('games/manual-one')};delete saved.publicId;assert.deepEqual(saved,game);assert.deepEqual(f.records.get('shorts/short'),{gameId:'manual-one'});assert.equal([...f.records.keys()].filter(p=>p.startsWith('moderationLogs/')).length,2)
 const snapshot=structuredClone([...f.records]);assert.equal((await assignLegacyManualGameIdentifier('manual-one',deps)).changed,false);assert.deepEqual([...f.records],snapshot)
})
test('IGDB is unchanged and malformed or conflicting existing aliases fail without writes',async()=>{
 for(const data of [{source:'IGDB',publicId:undefined},{source:'manual',publicId:'bad'},{source:'manual',publicId:'mn0000'}]){const f=memory([['games/game',data]]),before=structuredClone([...f.records]);if(data.source==='IGDB')assert.equal((await assignLegacyManualGameIdentifier('game',{store:f.store,now})).changed,false);else await assert.rejects(assignLegacyManualGameIdentifier('game',{store:f.store,now}),/alias|conflict/);assert.deepEqual([...f.records],before)}
})
test('reservation collision or invalid clock never partially changes legacy records',async()=>{
 const f=memory([['games/manual-one',{source:'manual'}],['publicIdentifiers/mn0000',{kind:'manual-game',internalId:'other'}]]),before=structuredClone([...f.records]);await assert.rejects(assignLegacyManualGameIdentifier('manual-one',{store:f.store,now}),/conflict/);assert.deepEqual([...f.records],before);await assert.rejects(assignLegacyManualGameIdentifier('manual-one',{store:f.store,now:()=>new Date(NaN)}),/clock/)
})
