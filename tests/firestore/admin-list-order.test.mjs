import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {loadGameCatalog} from '../../server/games/admin-catalog.ts'
import {loadGameRequests} from '../../server/games/requests.ts'
import {loadCommentQueue} from '../../server/comments/queue.ts'
import {loadQueue} from '../../server/moderation/queue.ts'
import {listOrder,adminListFields,reportTitlesState} from '../../server/admin/list-page.ts'
import {prepareReportTitles} from '../../server/admin/prepare-report-titles.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),records=new Map(),id=n=>n.toString(16).padStart(64,'0'),sorts=['date-desc','date-asc','text-asc','text-desc'];let env
const calls={games:(sort,cursor,filter='active')=>loadGameCatalog({filter,sort,cursor},store),gameRequests:(sort,cursor,status='pending')=>loadGameRequests({status,sort,cursor},store),comments:(sort,cursor,status='approved')=>loadCommentQueue({status,sort,cursor},store),shorts:(sort,cursor,queue='pending')=>loadQueue({queue,sort,cursor},store),reportSummaries:(sort,cursor)=>loadQueue({queue:'reports',sort,cursor},store)}
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado')
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore()
 await store.transact(async tx=>{
  tx.set(reportTitlesState,{version:1,ready:true})
  for(let n=1;n<=43;n++){
   const name=['Alpha','Zeta','águia','Beta','beta'][n%5],createdAt=new Date(Date.UTC(2026,9,22,0,Math.floor(n/2)))
   const values={games:{officialName:name,status:'active',source:'manual',createdAt,reviewVersion:0,reviewStatus:n%2?'provisional':'reviewed'},gameRequests:{name,status:'pending',createdAt,revision:0},comments:{content:name,shortId:id(n),moderationStatus:'approved',createdAt,reviewVersion:0},shorts:{title:name,moderationStatus:'pending',createdAt},reportSummaries:{title:name,shortId:id(n),status:'pending',firstReportedAt:createdAt,lastReportedAt:new Date(Date.UTC(2026,9,23)-n*60000),count:1}}
   for(const [kind,data]of Object.entries(values)){tx.set(kind+'/'+id(n),data);records.set(kind+'/'+id(n),data)}
  }
  tx.set('games/'+id(99),{officialName:'Oculto',status:'hidden',source:'manual',createdAt:new Date()});tx.set('comments/'+id(99),{content:'Oculto',shortId:id(1),moderationStatus:'removed',createdAt:new Date()})
 })
});after(async()=>env?.cleanup())
test('cinco filas ordenam integralmente nos quatro sentidos com empates e três páginas',async()=>{
 for(const [kind,call]of Object.entries(calls))for(const sort of sorts){
  const field=adminListFields[kind][sort.startsWith('text-')?'text':'date'],sign=sort.endsWith('asc')?1:-1
  const expected=[...records].filter(([path])=>path.startsWith(kind+'/')).map(([path,data])=>({id:path.split('/')[1],data})).sort((a,b)=>sign*((a.data[field] instanceof Date?a.data[field]-b.data[field]:Buffer.compare(Buffer.from(a.data[field]),Buffer.from(b.data[field])))||a.id.localeCompare(b.id)))
  const first=await call(sort),second=await call(sort,first.next),third=await call(sort,second.next)
  assert.deepEqual([first.items.length,second.items.length,third.items.length],[20,20,3],kind+sort);assert.equal(third.next,null);assert.deepEqual([...first.items,...second.items,...third.items].map(item=>item.id),expected.map(item=>item.id),kind+sort)
 }
})
test('troca de filtro, ordem ou fila invalida cursor; valores arbitrários não viram campos consultados',async()=>{
 const first=await calls.games('text-asc')
 await assert.rejects(calls.games('text-desc',first.next),/invalid-input/);await assert.rejects(calls.games('text-asc',first.next,'banned'),/invalid-input/)
 const comments=await calls.comments('text-asc');await assert.rejects(calls.gameRequests('text-asc',comments.next),/invalid-input/)
 for(const sort of ['__name__','secret',{},['date-desc'],null])assert.throws(()=>listOrder('games','active',sort,undefined),/invalid-input/)
 for(const cursor of [{...first.next,id:'../bad'},{...first.next,value:'x'.repeat(501)},{...first.next,extra:true}])await assert.rejects(calls.games('text-asc',cursor),/invalid-input/)
 await assert.rejects(store.adminListPage({kind:'games',filter:'active',sort:'date-asc',limit:22}),/inválida/)
 assert.equal((await calls.games('text-asc',undefined,'banned')).next,null)
})
test('provisórios e estados ocultos mantêm seus filtros na consulta ordenada',async()=>{
 const provisional=await calls.games('text-desc',undefined,'provisional');assert.ok(provisional.items.every(item=>item.provisional));const hidden=await calls.games('date-asc',undefined,'hidden');assert.equal(hidden.items.length,1);assert.equal(hidden.items[0].id,id(99));const removed=await calls.comments('text-asc',undefined,'removed');assert.equal(removed.items.length,1);assert.equal(removed.items[0].id,id(99))
})
test('preenchimento preserva contadores, prepara em lotes de 30 e é idempotente',async()=>{
 const original=await store.get('reportSummaries/'+id(1));await store.transact(async tx=>{const {title,...legacy}=original;void title;tx.set('reportSummaries/'+id(1),legacy);tx.set(reportTitlesState,{version:1,ready:false})})
 await assert.rejects(calls.reportSummaries('text-asc'),/admin-order-preparing/)
 const result=await prepareReportTitles(store);assert.deepEqual(result,{examined:43,updated:1});assert.deepEqual(await store.get('reportSummaries/'+id(1)),original);assert.equal((await prepareReportTitles(store)).updated,0)
})
test('SDK visitante ou usuário com flag admin não lê nem altera resumos ou marcador de preparação',async()=>{
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('owner',{admin:true}).firestore()])for(const path of [reportTitlesState,'reportSummaries/'+id(1)]){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{ready:true,title:'Falso'}))}
})
test('origem ausente interrompe preparação sem fingir ordenação completa',async()=>{
 await store.transact(async tx=>tx.set('reportSummaries/'+id(100),{status:'pending',count:1}));await assert.rejects(prepareReportTitles(store),/invalid-summary-source/);assert.equal((await store.get(reportTitlesState)).ready,false)
})
