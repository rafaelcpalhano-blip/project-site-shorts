import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,collection,getDocs} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {runAdminBatch} from '../../src/features/admin/services/admin-bulk.ts'
import {moderateCatalogGame} from '../../server/games/admin-catalog.ts'
import {requestGame,reviewGameRequest} from '../../server/games/requests.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {reviewComment} from '../../server/comments/review-comment.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
import {reviewShort} from '../../server/moderation/review-short.ts'
import {nameStatePath} from '../../server/games/name-keys.ts'
const projectId='demo-clipzone-tests',visitor='a'.repeat(64),now=()=>new Date('2026-10-22T12:00:00Z'),reason='Conferência administrativa de lote'
const store=createRestStore({projectId,emulatorPort:8081}),clean={existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]},options={store,now,verify:async()=>clean}
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
async function seed(){await env.clearFirestore();await store.transact(async tx=>{tx.set(nameStatePath,{version:1,ready:true});for(const id of ['g1','g2'])tx.set('games/'+id,{officialName:'Jogo '+id,source:'manual',status:'active',createdAt:now()})})}
const read=path=>store.get(path)
const candidate=(kind,id,action,apply)=>({key:kind+':'+id,label:id,kind,actions:[action],apply})
async function logs(){let total;await env.withSecurityRulesDisabled(async c=>{total=(await getDocs(collection(c.firestore(),'moderationLogs'))).size});return total}

test('jogos em lote mantêm auditoria por registro e não repetem decisão já concluída',async()=>{
 await seed();const items=['g1','g2'].map(id=>candidate('game',id,'game:hide',()=>moderateCatalogGame({id,revision:0,confirmed:true,action:'hide',reason},'owner',options)))
 const result=await runAdminBatch(items,'game:hide',reason);assert.ok(result.results.every(r=>r.status==='done'));assert.equal((await read('games/g1')).status,'hidden');assert.equal((await read('games/g2')).status,'hidden');assert.equal(await logs(),2)
 const repeated=await runAdminBatch(items,'game:hide',reason);assert.deepEqual(repeated.results.map(r=>r.status),['failed','not-run']);assert.equal(await logs(),2)
 const db=env.authenticatedContext('owner',{admin:true}).firestore();await assertFails(setDoc(doc(db,'games/g1'),{status:'active'},{merge:true}));await assertFails(getDoc(doc(db,'gameModerationStates/g1')))
})

test('solicitações distintas criam seus próprios jogos manuais com reserva e auditoria individuais',async()=>{
 await seed();const items=[]
 for(const name of ['Jogo Solar Comunitário','Jogo Lunar Comunitário']){const {id}=await requestGame({name},visitor,options);items.push(candidate('request',id,'request:create',()=>reviewGameRequest({id,revision:0,action:'create',name,reason},'owner',options)))}
 const result=await runAdminBatch(items,'request:create',reason);assert.ok(result.results.every(r=>r.status==='done'))
 const records=await Promise.all(items.map(item=>read('gameRequests/'+item.key.split(':')[1])));assert.ok(records.every(r=>r.status==='linked'));assert.notEqual(records[0].gameId,records[1].gameId)
 for(const record of records){const game=await read('games/'+record.gameId);assert.equal(game.source,'manual');assert.equal(game.description,'')}
 assert.equal(await logs(),2)
})

test('falha parcial de comentários mantém aprovados, não consome número para os demais e preserva revisão',async()=>{
 await seed();const {id:shortId}=await submitShort({url:'https://clips.twitch.tv/BatchCommentClip',gameId:'g1',title:'Jogada de teste'},visitor,{...options,checkAbuse:async()=>{}})
 const comments=[];for(const content of ['merda','bosta','boiola'])comments.push(await submitComment({shortId,content,requestId:crypto.randomUUID()},visitor,options))
 await reviewComment({commentId:comments[1].id,revision:0,action:'reject',reason},'owner',options)
 const items=comments.map(({id})=>candidate('comment',id,'comment:approve',()=>reviewComment({commentId:id,revision:0,action:'approve',reason},'owner',options)))
 const result=await runAdminBatch(items,'comment:approve',reason);assert.deepEqual(result.results.map(r=>r.status),['done','failed','not-run'])
 assert.equal((await read('comments/'+comments[0].id)).publicationNumber,1);assert.equal((await read('comments/'+comments[1].id)).moderationStatus,'rejected');assert.equal((await read('comments/'+comments[2].id)).moderationStatus,'pending');assert.equal((await read('shorts/'+shortId)).commentCount,1)
 assert.equal((await read('comments/'+comments[2].id)).publicationNumber,undefined)
})

test('aprovação de vídeos respeita cinco por autor; desbloqueio e restauração não cobram duas vezes',async()=>{
 await seed();const ids=[]
 for(let n=0;n<3;n++){const result=await submitShort({url:'https://clips.twitch.tv/BatchQuotaClip'+n,gameId:'g1',title:'Jogada pendente '+n},visitor,{...options,checkAbuse:async()=>{},verify:async()=>({...clean,flags:['threat']})});assert.equal(result.status,'pending');ids.push(result.id)}
 const quota='submissionLimits/'+visitor+'-2026-10-22';await store.transact(async tx=>tx.set(quota,{count:4,dateKey:'2026-10-22',identifierHash:visitor}))
 const items=ids.map(id=>candidate('video',id,'video:approve',()=>reviewShort({shortId:id,action:'approve',revision:0,reportCount:0,reason},'owner',options)))
 const result=await runAdminBatch(items,'video:approve',reason);assert.deepEqual(result.results.map(r=>r.status),['done','failed','not-run']);assert.equal((await read(quota)).count,5)
 assert.equal((await read('shorts/'+ids[1])).moderationStatus,'pending');assert.equal((await read('shorts/'+ids[2])).reviewVersion,undefined)
 for(const [revision,action]of [[1,'block'],[2,'approve'],[3,'remove'],[4,'restore']])await reviewShort({shortId:ids[0],revision,action,reportCount:0,reason},'owner',options)
 assert.equal((await read(quota)).count,5);assert.equal((await read('shorts/'+ids[0])).moderationStatus,'published');assert.equal((await read('videoIdentities/'+ids[0])).shortId,ids[0])
})
