import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {collection,getDocs} from 'firebase/firestore'
import {createRestStore} from '../../server/firestore/rest-store.ts'
import {createPublicApi} from '../../server/http/public-api.ts'
import {createPublicReadClient} from '../../src/lib/firebase/public-read-api.ts'
import {createOrderedFeedClient} from '../../src/features/shorts/services/ordered-feed-api.ts'
const origin='https://clipzone.test',store=createRestStore({projectId:'demo-clipzone-tests',emulatorPort:8081});let env
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente8081')
 env=await initializeTestEnvironment({projectId:'demo-clipzone-tests',firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
after(async()=>env?.cleanup())
test('bootstrap real coordenado entrega15shorts/catálogo, contabiliza2leituras e continua bloqueando a terceira',async()=>{
 await env.clearFirestore()
 await store.transact(async tx=>{
  tx.set('games/game',{status:'active',officialName:'Fixture',source:'manual'})
  for(let n=0;n<15;n++)tx.set('shorts/s'+n,{gameId:'game',moderationStatus:'published',title:'Fixture '+n,platform:'Twitch',platformVideoId:'QueueFixture'+n,normalizedUrl:'https://clips.twitch.tv/QueueFixture'+n,channelName:'Teste',createdAt:new Date(1700000000000+n*1000),likeCount:0})
 })
 const measurements=[]
 for(let n=0;n<2;n++){
  const api=await createPublicApi({origin,store,now:()=>new Date(),visitorSecret:'ab'.repeat(32),maximumAttempts:2,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}})
  let cookie='',active=0,maximum=0;const requests=[]
  const transport=async(path,options)=>{
   const start=performance.now();if(path!=='/api/session'){active++;maximum=Math.max(maximum,active)}
   try{
    const response=await api(new Request(origin+path,{...options,headers:{...options.headers,origin,cookie}}))
    if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0]
    requests.push({path,status:response.status,ms:performance.now()-start});return response
   }finally{if(path!=='/api/session')active--}
  }
  const client=createPublicReadClient(transport),feed=createOrderedFeedClient(transport),start=performance.now()
  const [games,shorts]=await Promise.all([client.listGames(),feed('latest')]);const bootstrapMs=performance.now()-start
  assert.equal(games.items.length,1);assert.equal(shorts.items.length,15);assert.equal(maximum,1)
  await assert.rejects(client.listGames(),e=>e.kind==='rate-limit')
  await env.withSecurityRulesDisabled(async context=>{const counters=await getDocs(collection(context.firestore(),'publicReadAttempts'));assert.equal(counters.size,n+1);assert.ok(counters.docs.every(doc=>doc.data().count===2))})
  measurements.push({bootstrapMs,maximumConcurrentPublicReads:maximum,requests})
 }
 console.log(JSON.stringify(measurements))
 if(process.env.CLIPZONE_QUEUE_MEASUREMENT_FILE)await writeFile(process.env.CLIPZONE_QUEUE_MEASUREMENT_FILE,JSON.stringify(measurements,null,2))
})
