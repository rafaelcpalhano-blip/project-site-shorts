import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createManualGame} from '../../server/games/manual-game.ts'
import {nameStatePath} from '../../server/games/name-keys.ts'
import {submitComment} from '../../server/comments/submit-comment.ts'
import {recordPlaybackFailure} from '../../server/playback/record-failure.ts'
import {loadUpdates,markUpdateRead} from '../../server/admin/updates.ts'
import {loadAdminHistory} from '../../server/admin/history.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),id='a'.repeat(64),visitor=n=>n.toString(16).padStart(64,'0'),now=()=>new Date('2026-10-25T12:00:00Z');let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Isolated 8081 required');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore();await store.transact(async tx=>{tx.set(nameStatePath,{version:1,ready:true});tx.set('games/portal',{officialName:'Portal',status:'active'});tx.set('shorts/'+id,{platform:'YouTube',gameId:'portal',moderationStatus:'published',normalizedUrl:'https://www.youtube.com/shorts/28nFy4tGcwI',title:'Jogada',channelName:'Canal',reviewVersion:0,commentCount:0,lastCommentNumber:0})})})
after(async()=>env?.cleanup())
test('REST transactions reserve unique permanent aliases across concurrent creations and retries',async()=>{
 const deps={store,now};const games=await Promise.all(Array.from({length:4},(_,n)=>createManualGame({name:'Projeto Solar '+n},visitor(n+1),deps)));assert.equal(new Set(games.map(g=>g.game.id)).size,4)
 const records=await Promise.all(games.map(g=>store.get('games/'+g.game.id)));assert.equal(new Set(records.map(g=>g.publicId)).size,4);assert.ok(records.every(g=>/^mn\d{4}$/.test(g.publicId)))
 const again=await createManualGame({name:'Projeto Solar 0'},visitor(1),deps);assert.equal(again.created,false);assert.equal((await store.get('publicIdentifierCounters/manual-game')).next,4)
 const requests=Array.from({length:3},(_,n)=>({shortId:id,content:'Boa jogada '+n,requestId:crypto.randomUUID()}));const comments=await Promise.all(requests.map((input,n)=>submitComment(input,visitor(n+10),deps)));const saved=await Promise.all(comments.map(c=>store.get('comments/'+c.id)));assert.equal(new Set(saved.map(c=>c.publicId)).size,3);assert.deepEqual(saved.map(c=>c.publicationNumber).sort(),[1,2,3]);await submitComment(requests[0],visitor(10),deps);assert.equal((await store.get('publicIdentifierCounters/comment')).next,3)
 assert.equal((await loadAdminHistory({kind:'comment',id:saved[0].publicId},store)).items.length,1)
})
test('REST receipt deduplication, threshold, trusted negative proof and inbox read version work together',async()=>{
 let verify=0;const deps={store,now,verify:async()=>{verify++;return {existence:'missing'}}};for(let n=0;n<15;n++){const input={shortId:id,signal:'youtube-150'};await recordPlaybackFailure(input,visitor(n+100),deps);if(n<14)await recordPlaybackFailure(input,visitor(n+100),deps)}
 assert.equal(verify,1);assert.equal((await store.get('playbackSummaries/'+id)).eligibleCount,15);assert.equal((await store.get('shorts/'+id)).moderationStatus,'pending');assert.equal((await store.get('shorts/'+id)).commentCount,3)
 const page=await loadUpdates({category:'playback'},'owner',store);assert.equal(page.items.length,1);assert.equal(page.items[0].action,'playback-block');assert.equal(page.items[0].count,15);assert.equal(page.items[0].signals['youtube-150'],15);await markUpdateRead({id:page.items[0].id,version:2},'owner',store,now);assert.equal((await loadUpdates({},'owner',store)).items[0].read,true);assert.equal((await loadUpdates({},'other',store)).items[0].read,false)
})
test('direct browser access cannot read or forge counters, reservations, failure receipts or admin read states',async()=>{
 const db=env.unauthenticatedContext().firestore();for(const collection of ['publicIdentifierCounters','publicIdentifiers','playbackSummaries','playbackReceipts','adminUpdateReads']){await assertFails(getDoc(doc(db,collection,'private')));await assertFails(setDoc(doc(db,collection,'forged'),{count:999}))}
})
