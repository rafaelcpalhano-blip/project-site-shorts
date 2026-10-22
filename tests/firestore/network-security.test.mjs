import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,getDocs,collection} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createNetworkProtection} from '../../server/security/network-abuse.ts'
import {cleanupNetworkAbuse} from '../../server/security/network-retention.ts'
import {shortLike} from '../../server/likes/short-likes.ts'
import {submitShort} from '../../server/submissions/submit-short.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),ip='203.0.113.10',now=()=>new Date('2026-10-22T12:00:00Z'),secret='ab'.repeat(32)
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
async function seed(){await env.clearFirestore();await store.transact(async tx=>{tx.set('games/game',{officialName:'Game',status:'active'});tx.set('shorts/s1',{gameId:'game',moderationStatus:'published',likeCount:0})});return createNetworkProtection({store,secret,now})}
async function networkRows(){let rows;await env.withSecurityRulesDisabled(async context=>{rows=(await getDocs(collection(context.firestore(),'networkAbuse'))).docs.map(item=>({id:item.id,data:item.data()}))});return rows}

test('REST: concorrência não ultrapassa contribuições de rede; repetição e desfazer não consomem novamente',async()=>{
 const guard=await seed(),options={store,now,prepareNetworkLike:(tx,id)=>guard.prepareContribution(tx,ip,'like',id)},visitors=Array.from({length:21},(_,i)=>(i+1).toString(16).padStart(64,'0'))
 for(let i=0;i<20;i+=2)await Promise.all(visitors.slice(i,i+2).map(visitor=>shortLike({shortId:'s1',liked:true,revision:0},visitor,options,true)))
 await assert.rejects(shortLike({shortId:'s1',liked:true,revision:0},visitors[20],options,true),/abuse-limit/)
 const before=(await networkRows())[0];assert.equal(before.data.likes,20);assert.equal((await store.get('shorts/s1')).likeCount,20)
 await shortLike({shortId:'s1',liked:true,revision:0},visitors[0],options,true)
 await shortLike({shortId:'s1',liked:false,revision:1},visitors[0],options,true)
 await shortLike({shortId:'s1',liked:true,revision:2},visitors[0],options,true)
 assert.equal((await store.get('networkAbuse/'+before.id)).likes,20);assert.equal((await store.get('shorts/s1')).likeCount,20)
 const anonymous=env.unauthenticatedContext().firestore(),fakeAdmin=env.authenticatedContext('other',{admin:true}).firestore()
 for(const db of [anonymous,fakeAdmin]){await assertFails(getDoc(doc(db,'networkAbuse',before.id)));await assertFails(setDoc(doc(db,'networkAbuse',before.id),{likes:0}));await assertFails(getDoc(doc(db,'shorts','s1')))}
})

test('REST: duas publicações paralelas no último espaço da rede só confirmam uma e não gastam cota da recusada',async()=>{
 const guard=await seed();await store.transact(async tx=>{const apply=await guard.prepareContribution(tx,ip,'publication');apply()})
 const row=(await networkRows())[0];await store.transact(async tx=>tx.set('networkAbuse/'+row.id,{...await tx.get('networkAbuse/'+row.id),publications:29}))
 const dependencies={store,now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]}),prepareNetworkPublication:tx=>guard.prepareContribution(tx,ip,'publication')}
 const visitors=['a'.repeat(64),'b'.repeat(64)],results=await Promise.allSettled(visitors.map((visitor,i)=>submitShort({url:'https://clips.twitch.tv/LastNetworkClip'+i,gameId:'game',title:'Boa jogada'},visitor,dependencies)))
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal((await store.get('networkAbuse/'+row.id)).publications,30)
 const loser=results.findIndex(result=>result.status==='rejected');assert.equal(await store.get('submissionLimits/'+visitors[loser]+'-2026-10-22'),null)
 const rejected=results[loser];assert.equal(rejected.reason.code,'abuse-limit')
})

test('REST: emissões concorrentes e novo processo preservam limites e retenção remove apenas expirados',async()=>{
 let guard=await seed()
 for(let i=0;i<8;i+=2)await Promise.all([guard.attempt(ip,'sessions'),guard.attempt(ip,'sessions')])
 guard=await createNetworkProtection({store,secret,now});await assert.rejects(guard.attempt(ip,'sessions'),/abuse-limit/)
 const data=(await networkRows())[0];assert.equal(data.data.total,8);assert.ok(!JSON.stringify(data).includes(ip))
 await store.transact(async tx=>{for(let i=0;i<32;i++)tx.set('networkAbuse/'+i.toString(16).padStart(64,'0'),{expiresAt:new Date(now().getTime()-1)})})
 let result=await cleanupNetworkAbuse({store,now});assert.equal(result.deleted,30);assert.equal(result.more,true)
 result=await cleanupNetworkAbuse({store,now});assert.equal(result.deleted,2);assert.equal((await networkRows()).length,1);assert.equal((await store.get('networkAbuse/'+data.id)).total,8)
})
