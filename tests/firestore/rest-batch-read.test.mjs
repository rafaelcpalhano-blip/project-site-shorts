import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {readOrderedFeed} from '../../server/ranking/read-feed.ts'
let env
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Isolated emulator 8081 required')
 env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081}})
 await env.clearFirestore()
})
after(async()=>{await env?.cleanup()})
test('real REST batch preserves missing/order/types, current moderation and snapshot continuation',async t=>{
 const store=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081}),now=new Date('2026-10-25T07:00:00Z')
 await store.transact(async tx=>{
  for(let i=0;i<31;i++){
   const id='batch'+String(i).padStart(2,'0')
   tx.set('games/'+id,{status:'active',officialName:'Game '+i,source:'manual'})
   tx.set('shorts/'+id,{gameId:id,moderationStatus:'published',createdAt:new Date(now.getTime()-1000-i*1000),title:'Clip '+i,platform:'Twitch',platformVideoId:'BatchProof'+i,normalizedUrl:'https://clips.twitch.tv/BatchProof'+i,channelName:'Canal',likeCount:0})
  }
 })
 const docs=await store.getMany(['shorts/batch01','games/missing','games/batch00'])
 assert.equal(docs[0].title,'Clip 1');assert.ok(docs[0].createdAt instanceof Date);assert.equal(docs[1],null);assert.equal(docs[2].officialName,'Game 0')
 const snapshot=await store.rankingPage({mode:'latest',limit:15})
 await store.transact(async tx=>{for(let i=0;i<31;i++)tx.set('games/batch'+String(i).padStart(2,'0'),{status:'hidden',officialName:'Hidden'})})
 const realFetch=globalThis.fetch;let calls=0
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.ok(String(url).startsWith('http://127.0.0.1:8081/v1/projects/demo-clipzone-tests/'))
  calls++;return realFetch(url,options)
 })
 const fixed={...store,rankingPage:query=>store.rankingPage({...query,readTime:snapshot.readTime})}
 const page=await readOrderedFeed({},{store:fixed,now:()=>new Date()})
 assert.deepEqual(page.items,[]);assert.equal(page.candidatesExamined,30);assert.equal(page.limited,true);assert.ok(page.next)
 assert.equal(page.next.readTime,snapshot.readTime);assert.equal(calls,18) // 2 queries + 8 short batches + 8 game batches, no HTTP limiter here.
 const next=await readOrderedFeed({cursor:page.next},{store:fixed,now:()=>new Date()})
 assert.equal(next.candidatesExamined,1);assert.equal(next.next,null)
})

