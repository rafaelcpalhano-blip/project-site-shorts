import {createPublicApi} from '../../server/http/public-api.ts'
import {createPublicReadClient} from '../../src/lib/firebase/public-read-api.ts'
import {createPublicRepository} from '../../src/lib/firebase/public-repository.ts'

// Exercise the current browser client through the actual same-origin API and
// emulator REST store. Keep SDK/rules assertions in each integration test.
export async function createEmulatorPublicRepository(database,{store,now}){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('isolated-emulator-required')
 const origin='https://clipzone.test',api=await createPublicApi({origin,store,now,visitorSecret:'e1'.repeat(32),maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{throw Error('provider-not-used-in-public-read')}})
 let cookie=''
 const reads=createPublicReadClient(async(path,init)=>{
  const response=await api(new Request(origin+path,{...init,headers:{...init.headers,origin,cookie}}))
  const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0]
  return response
 })
 return createPublicRepository(database,reads)
}

export async function readEmulatorPublicGame(database,id,options){
 return (await createEmulatorPublicRepository(database,options)).getGame(id)
}
