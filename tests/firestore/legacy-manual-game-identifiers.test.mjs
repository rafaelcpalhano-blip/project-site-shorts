import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {assignLegacyManualGameIdentifier} from '../../server/identifiers/legacy-manual-games.ts'
import {loadGameCatalog} from '../../server/games/admin-catalog.ts'
import {loadAdminHistory} from '../../server/admin/history.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),now=()=>new Date('2026-10-25T12:00:00Z');let env
const game={officialName:'Exjanitor',source:'manual',status:'active',reviewStatus:'reviewed',reviewVersion:3,description:'Preservada',aliases:['Ex Janitor'],createdAt:now()}
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Only isolated 8081');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore();await store.transact(async tx=>{tx.set('games/manual-one',game);tx.set('games/manual-existing',{...game,publicId:'mn0000'});tx.set('publicIdentifiers/mn0000',{kind:'manual-game',internalId:'manual-existing',createdAt:now()});tx.set('publicIdentifierCounters/manual-game',{next:1});tx.set('games/igdb-123',{...game,source:'IGDB'});tx.set('shorts/kept',{gameId:'manual-one',title:'Preservado'})})});after(async()=>env?.cleanup())
test('real legacy backfill is concurrent/idempotent, preserves old aliases, internal references and administrative lookup',async()=>{
 const deps={store,now},results=await Promise.all(['manual-one','manual-one','manual-existing','igdb-123'].map(id=>assignLegacyManualGameIdentifier(id,deps)));assert.equal(results.filter(r=>r.changed).length,1);assert.equal(results[0].publicId,'mn0001');assert.equal(results[1].publicId,'mn0001');assert.equal(results[2].publicId,'mn0000');assert.equal(results[3].publicId,null)
 const updated=await store.get('games/manual-one');assert.equal(updated.publicId,'mn0001');delete updated.publicId;assert.deepEqual(updated,game);assert.deepEqual(await store.get('shorts/kept'),{gameId:'manual-one',title:'Preservado'});assert.deepEqual(await store.get('games/igdb-123'),{...game,source:'IGDB'});assert.equal((await store.get('publicIdentifierCounters/manual-game')).next,2)
 const page=await loadGameCatalog({filter:'all',sort:'date-desc'},store);assert.equal(page.items.find(row=>row.id==='manual-one').publicId,'mn0001');const history=await loadAdminHistory({kind:'game',id:'mn0001'},store);assert.equal(history.items.length,1);assert.equal(history.items[0].action,'assign-public-id')
})
