import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,getDocs,collection} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {editManualGame} from '../../server/games/edit-manual-game.ts'
import {createManualGame} from '../../server/games/manual-game.ts'
import {nameStatePath} from '../../server/games/name-keys.ts'
const projectId='demo-clipzone-tests',store=createRestStore({projectId,emulatorPort:8081}),now=()=>new Date('2026-10-23T12:00:00Z')
let env
before(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado');env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})})
after(async()=>env?.cleanup())
async function seed(){await env.clearFirestore();await store.transact(async tx=>tx.set(nameStatePath,{version:1,ready:true}));return (await createManualGame({name:'Jogo da capa'},'a'.repeat(64),{store,now})).game.id}
const input=id=>({id,revision:0,reason:'Capa pública conferida',confirmed:true,details:{name:'Jogo da capa',description:'Dados do autor',imageUrl:'https://cdn.example.org/cover.png',releaseDate:null,genres:[],gameModes:[],platforms:[],aliases:[]}})
async function logs(){let values;await env.withSecurityRulesDisabled(async c=>{values=(await getDocs(collection(c.firestore(),'moderationLogs'))).docs.map(d=>d.data())});return values}
test('REST: fonte pendente não grava; capa estática preserva identidade, auditoria e bloqueio do SDK',async()=>{
 const id=await seed(),before=await store.get('games/'+id);let inspections=0
 await assert.rejects(editManualGame(input(id),'owner',{store,now,inspectCover:async()=>{inspections++;return input(id).details.imageUrl}}),/invalid-input/)
 assert.equal(inspections,0);assert.deepEqual(await store.get('games/'+id),before);assert.equal((await logs()).filter(d=>d.action==='edit-metadata').length,0)
 const allowed={...input(id),details:{...input(id).details,imageUrl:'/images/games/capa.png'}}
 await editManualGame(allowed,'owner',{store,now,inspectCover:async()=>assert.fail('sem inspeção remota')})
 const game=await store.get('games/'+id);assert.equal(game.imageUrl,allowed.details.imageUrl);assert.equal(game.source,'manual');assert.equal(game.status,'active');assert.equal(game.reviewVersion,1);assert.equal(game.createdAt.getTime(),before.createdAt.getTime())
 const audit=(await logs()).filter(d=>d.action==='edit-metadata');assert.equal(audit.length,1);assert.equal(audit[0].after.imageUrl,allowed.details.imageUrl)
 const db=env.unauthenticatedContext().firestore();assert.equal((await getDoc(doc(db,'games',id))).data().imageUrl,allowed.details.imageUrl);await assertFails(setDoc(doc(db,'games',id),{imageUrl:'forged'},{merge:true}));await assertFails(setDoc(doc(env.authenticatedContext('owner',{admin:true}).firestore(),'games',id),{imageUrl:'forged'},{merge:true}))
 await assert.rejects(editManualGame(allowed,'owner',{store,now}),/stale-review/)
})
