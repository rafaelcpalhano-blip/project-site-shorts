import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {readFile} from 'node:fs/promises'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createNetworkProtection} from '../../server/security/network-abuse.ts'
const projectId='demo-clipzone-tests';let env
before(async()=>{assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8081');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore()})
after(async()=>env?.cleanup())
test('real Firestore starts read/write on first batchGet and preserves atomic concurrent quota limits',async()=>{
 const operations=[];const store=createRestStore({projectId,emulatorPort:8081,lazyTransactions:true,fetcher:async(input,init)=>{assert.ok(String(input).startsWith('http://127.0.0.1:8081/'));operations.push(String(input).split(':').at(-1));return fetch(input,init)}})
 await store.transact(async tx=>{const [a,b]=await Promise.all([tx.get('games/a'),tx.get('games/b')]);assert.equal(a,null);assert.equal(b,null);tx.create('games/a',{value:1})});assert.deepEqual(operations,['batchGet','batchGet','commit']);assert.equal((await store.get('games/a')).value,1)
 const opts={secret:'ea'.repeat(32),store,now:()=>new Date('2026-10-26T12:00:00Z')};for(let n=0;n<7;n++)await(await createNetworkProtection(opts)).attempt('8.8.8.8','sessions')
 const concurrent=await Promise.allSettled(Array.from({length:2},async()=> (await createNetworkProtection(opts)).attempt('8.8.8.8','sessions')));assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.filter(r=>r.status==='rejected').length,1)
 await assert.rejects(async()=> (await createNetworkProtection(opts)).attempt('8.8.8.8','sessions'),error=>error.code==='abuse-limit')
 await assert.rejects(store.transact(async tx=>{await tx.get('games/a');tx.create('games/a',{value:2})}));assert.equal((await store.get('games/a')).value,1)
})
