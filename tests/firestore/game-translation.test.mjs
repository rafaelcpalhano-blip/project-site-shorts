import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createGameTranslation} from '../../server/games/translation-store.ts'
import {createPublicRepository} from '../../src/lib/firebase/public-repository.ts'
const projectId='demo-clipzone-tests',now=()=>new Date('2026-10-21T15:00:00Z')
const store=createRestStore({projectId,emulatorPort:8081}),game={externalId:'1',officialName:'Portal',source:'IGDB',description:'Portal is a game.',aliases:[],status:'active'}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
const read=path=>store.transact(tx=>tx.get(path))
async function seed(){await env.clearFirestore();await store.transact(async tx=>tx.set('games/igdb-1',game));return env.unauthenticatedContext().firestore()}
test('REST reserva uma chamada concorrente, persiste pt-BR/original e protege tarefas e orçamento privados',async()=>{
 const db=await seed();let calls=0
 const translate=createGameTranslation({store,now,maximumPerDay:20,translate:async()=>{calls++;return 'Portal é um jogo.'}})
 await Promise.all([translate('igdb-1'),translate('igdb-1'),translate('igdb-1')]);await translate('igdb-1');assert.equal(calls,1)
 const result=await createPublicRepository(db).getGame('igdb-1');assert.equal(result.description,game.description);assert.equal(result.descriptionPtBr,'Portal é um jogo.')
 await assertSucceeds(getDoc(doc(db,'games','igdb-1')))
 for(const path of ['gameTranslations/igdb-1','translationUsage/2026-10-21']){
  await assertFails(getDoc(doc(db,path)));await assertFails(getDoc(doc(env.authenticatedContext('owner',{admin:true}).firestore(),path)))
 }
 await assertFails(setDoc(doc(db,'games','igdb-1'),{translation:{text:'forged'}}))
 assert.equal((await read('translationUsage/2026-10-21')).count,1)
})
test('REST descarta resultado obsoleto e falha mantém o jogo público sem gravação parcial',async()=>{
 const db=await seed()
 const translate=createGameTranslation({store,now,maximumPerDay:20,translate:async()=>{
  await store.transact(async tx=>{const old=await tx.get('games/igdb-1');tx.set('games/igdb-1',{...old,description:'New source text.'})})
  return 'Tradução da descrição antiga.'
 }})
 await translate('igdb-1');assert.equal((await read('games/igdb-1')).translation,undefined);assert.equal((await read('gameTranslations/igdb-1')).status,'stale')
 const fail=createGameTranslation({store,now,maximumPerDay:20,translate:async()=>{throw new Error('private provider failure')}})
 await fail('igdb-1');assert.equal((await read('gameTranslations/igdb-1')).status,'failed')
 assert.equal((await createPublicRepository(db).getGame('igdb-1')).description,'New source text.')
})
test('REST aplica orçamento diário transacional a jogos concorrentes',async()=>{
 await seed();await store.transact(async tx=>tx.set('games/igdb-2',{...game,externalId:'2'}));let calls=0
 const translate=createGameTranslation({store,now,maximumPerDay:1,translate:async()=>{calls++;return 'Portal é um jogo.'}})
 await Promise.all([translate('igdb-1'),translate('igdb-2')]);assert.equal(calls,1);assert.equal((await read('translationUsage/2026-10-21')).count,1)
})
