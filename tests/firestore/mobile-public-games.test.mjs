import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {readGames,readGame} from '../../server/public/read-games.ts'
let env
const store=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081})
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado 8081')
 env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
after(async()=>env?.cleanup())
test('REST real pagina 120 jogos por nome/ID, inclui provisório ativo e omite oculto/banido sem vazar campos',async()=>{
 await env.clearFirestore()
 await store.transact(async tx=>{
  for(let n=0;n<120;n++)tx.set('games/g'+String(n).padStart(3,'0'),{officialName:'Nome '+String(Math.floor(n/2)).padStart(3,'0'),status:'active',source:'manual',reviewStatus:'provisional',privateFlag:'private'})
  for(const status of ['hidden','banned'])tx.set('games/'+status,{officialName:'A '+status,status,source:'manual'})
 })
 const first=await readGames({},store),second=await readGames({cursor:first.next},store),last=await readGames({cursor:second.next},store)
 assert.deepEqual([first.items.length,second.items.length,last.items.length],[50,50,20]);assert.equal(last.next,null)
 const all=[...first.items,...second.items,...last.items];assert.equal(new Set(all.map(g=>g.id)).size,120)
 assert.deepEqual(all.map(g=>g.id),Array.from({length:120},(_,n)=>'g'+String(n).padStart(3,'0')))
 assert.ok(!JSON.stringify(all).includes('private'));assert.equal((await readGame({gameId:'g000'},store)).provisional,true)
 await assert.rejects(readGame({gameId:'hidden'},store),e=>e.status===404)
})
