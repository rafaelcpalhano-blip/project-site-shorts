import { TITLE_SEARCH_ENABLED } from '../../src/lib/features/title-search.ts'
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {getDoc,setDoc,doc,getDocs,query,collection,where,limit} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {searchTitles} from '../../server/search/search-titles.ts'
import {backfillTitlePage} from '../../server/search/backfill-titles.ts'
import {titleSearchFields} from '../../src/lib/validation/title-search.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests',now=()=>new Date('2026-10-21T15:00:00Z'),visitor='a'.repeat(64)
const store=createRestStore({projectId,emulatorPort:8081})
const record=(n,title,patch={})=>({id:'search-'+String(n).padStart(3,'0'),data:{title,...titleSearchFields(title),moderationStatus:'published',platform:'Twitch',platformVideoId:'Clip'+n,normalizedUrl:'https://clips.twitch.tv/Clip'+n,gameId:'portal',channelName:'Canal',createdAt:new Date(1700000000000+n*1000),...patch}})
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
async function seed(rows=[]){await env.clearFirestore();await store.transact(async tx=>{tx.set('searchState/title-v1',{ready:true});for(const row of rows)tx.set('shorts/'+row.id,row.data)});return env.unauthenticatedContext().firestore()}
const read=path=>store.transact(tx=>tx.get(path))
test('REST filtra trecho inteiro no início/meio/fim, acentos, jogo e estados ocultos',async()=>{
 await seed([record(1,'Começo épico fim'),record(2,'Um ÉPICO no meio'),record(3,'Tudo termina épico',{gameId:'tibia'}),record(4,'épico pendente',{moderationStatus:'pending'}),record(5,'épico removido',{moderationStatus:'removed'})])
 assert.deepEqual((await searchTitles({query:'epico',gameId:'portal'},store)).items.map(v=>v.id),['search-002','search-001'])
 assert.equal((await searchTitles({query:'COMEÇO'},store)).items.length,1);assert.equal((await searchTitles({query:'fim'},store)).items.length,1)
 assert.equal((await searchTitles({query:'termina epico'},store)).items[0].gameId,'tibia')
 assert.equal((await searchTitles({query:'nada parecido'},store)).exhausted,true)
})
test('REST pagina títulos comuns e datas iguais com 30 candidatos e até 15 resultados sem perder registros',async()=>{
 await seed(Array.from({length:47},(_,i)=>record(i,'Minha jogada '+i,{createdAt:now()})))
 let cursor,ids=[],calls=0,documents=0
 do{const result=await searchTitles({query:'minha',...(cursor?{cursor}:{})},store);assert.ok(result.candidatesRead<=30);assert.ok(result.candidatesExamined<=30);assert.ok(result.items.length<=15);documents+=result.candidatesRead;calls++;ids.push(...result.items.map(v=>v.id));cursor=result.next}while(cursor)
 assert.equal(ids.length,47);assert.equal(new Set(ids).size,47);assert.equal(calls,4)
 console.log(JSON.stringify({measurement:'common-term',uniqueResults:ids.length,calls,candidateDocumentsRead:documents,maxCandidatesPerCall:30}))
 await assert.rejects(store.searchShorts({fragment:'min',limit:31}),/inválida/)
})
test('REST página vazia por orçamento continua e lote exato termina só após consulta final',async()=>{
 const rows=[record(0,'Minha virada')];for(let n=1;n<=30;n++)rows.push(record(n,'Minha vitória'))
 await seed(rows)
 const first=await searchTitles({query:'minha virada'},store);assert.equal(first.items.length,0);assert.equal(first.candidatesRead,30);assert.equal(first.limited,true);assert.ok(first.next)
 const second=await searchTitles({query:'minha virada',cursor:first.next},store);assert.equal(second.items[0].id,'search-000');assert.equal(second.exhausted,true)
 await seed(rows.slice(1));const empty=await searchTitles({query:'minha virada'},store);assert.ok(empty.next)
 const end=await searchTitles({query:'minha virada',cursor:empty.next},store);assert.equal(end.items.length,0);assert.equal(end.exhausted,true)
})
test('REST backfill antigo é paginado, idempotente, preserva estado e trata título atual em transação',async()=>{
 const rows=Array.from({length:35},(_,i)=>{const row=record(i,'Título antigo '+i,{moderationStatus:i%2?'pending':'published',extra:'keep'});delete row.data.searchFragments;delete row.data.titleSearchVersion;return row})
 const db=await seed(rows);await store.transact(async tx=>tx.set('searchState/title-v1',{ready:false}))
 await assert.rejects(searchTitles({query:'antigo'},store),/search-preparing/)
 const first=await backfillTitlePage(store);assert.equal(first.examined,30);assert.equal(first.updated,30);assert.ok(first.next)
 const second=await backfillTitlePage(store,first.next);assert.equal(second.examined,5);assert.equal(second.updated,5);assert.equal(second.next,null)
 assert.equal((await backfillTitlePage(store)).updated,0)
 const old=await read('shorts/search-001');assert.equal(old.moderationStatus,'pending');assert.equal(old.extra,'keep')
 await assertFails(getDoc(doc(db,'searchState/title-v1')));await assertFails(setDoc(doc(db,'shorts','search-000'),{searchFragments:['forged']}))
 await store.transact(async tx=>tx.set('searchState/title-v1',{ready:true}));assert.ok((await searchTitles({query:'antigo'},store)).items.length)
})
test('publicação respeita ativação dos fragmentos sem alterar deduplicação e cota de cinco',async()=>{
 const db=await seed();await store.transact(async tx=>tx.set('games/portal',{officialName:'Portal',status:'active'}))
 const deps={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[],title:'Jogada de ação'})}
 const input=i=>({url:'https://clips.twitch.tv/SearchClip'+i,gameId:'portal',title:'Vitória no final '+i})
 const first=await submitShort(input(0),visitor,deps)
 const saved=await read('shorts/'+first.id)
 if(TITLE_SEARCH_ENABLED) assert.ok(saved.searchFragments.includes('vit'))
 else {assert.equal(saved.searchFragments,undefined);assert.equal(saved.titleSearchVersion,undefined)}
 await assertFails(getDoc(doc(db,'shorts',first.id)))
 if(TITLE_SEARCH_ENABLED) assert.equal((await searchTitles({query:'final 0'},store)).items[0].id,first.id)
 else assert.equal((await searchTitles({query:'final 0'},store)).items.length,0)
 await assert.rejects(submitShort(input(0),visitor,deps),/duplicate-video/)
 for(let i=1;i<5;i++)await submitShort(input(i),visitor,deps)
 await assert.rejects(submitShort(input(5),visitor,deps),/daily-limit/)
 assert.equal((await read('submissionLimits/'+visitor+'-2026-10-21')).count,5)
 const owner=env.authenticatedContext('owner',{admin:true}).firestore();await assertFails(setDoc(doc(owner,'shorts',first.id),{titleSearchVersion:999}))
 await assertFails(getDocs(query(collection(db,'shorts'),where('moderationStatus','==','published'),limit(30))))
})
test('remoção entre páginas não expõe itens e cursor permanece vinculado ao filtro',async()=>{
 await seed(Array.from({length:20},(_,i)=>record(i,'Jogada comum')))
 const first=await searchTitles({query:'comum'},store)
 const upcoming='shorts/search-003';await store.transact(async tx=>{const row=await tx.get(upcoming);tx.set(upcoming,{...row,moderationStatus:'removed'})})
 const next=await searchTitles({query:'comum',cursor:first.next},store);assert.equal(next.items.length,4);assert.ok(!next.items.some(v=>v.id==='search-003'))
 await assert.rejects(searchTitles({query:'outro',cursor:first.next},store),/invalid-cursor/)
 await assert.rejects(searchTitles({query:'comum',gameId:'tibia',cursor:first.next},store),/invalid-cursor/)
})
