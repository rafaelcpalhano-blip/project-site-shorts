import {createConnection} from 'node:net'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {diagnoseGameNames,prepareGameNames} from '../server/games/prepare-name-keys.ts'
const mode=process.argv[2]
if(!['diagnose','apply'].includes(mode)||process.argv.length!==3)throw new Error('Use diagnose ou apply. Destino fixo: emulador local.')
const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080})
if(mode==='apply'){
 const running=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:5174});socket.setTimeout(2000);socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(true)})})
 if(running)throw new Error('Pare a API local da porta 5174 antes de preencher as reservas.')
 console.log(JSON.stringify(await prepareGameNames(store)))
}else{
 const result=await diagnoseGameNames(store)
 console.log(JSON.stringify({examined:result.rows.length,keys:result.keys,collisions:result.collisions}))
 if(result.collisions.length)process.exitCode=1
}
