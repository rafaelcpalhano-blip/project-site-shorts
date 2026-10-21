import { bootstrapRanking } from '../server/ranking/bootstrap.ts'
import { createConnection } from 'node:net'
// Manual local commands only. No scheduler, cloud project or public endpoint.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {prepareRanking} from '../server/ranking/prepare.ts'
import {buildRankingGeneration} from '../server/ranking/generation.ts'
import {pruneRankingGeneration} from '../server/ranking/retention.ts'
const [command,id,...extra]=process.argv.slice(2)
if(!['inspect','prepare','build','prune','metrics-inspect','metrics-prepare'].includes(command)||extra.length||command!=='prune'&&id!==undefined||command==='prune'&&!/^[a-f0-9]{32}$/.test(id??''))throw Error('Use inspect|prepare|metrics-inspect|metrics-prepare|build ou prune ID')
const options={store:createRestStore({projectId:'demo-clipzone',emulatorPort:8080}),now:()=>new Date()}
try{
 if(command==='metrics-prepare'){
  const listening=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:5174});socket.setTimeout(1500);socket.on('connect',()=>{socket.destroy();resolve(true)});socket.on('error',()=>resolve(false));socket.on('timeout',()=>{socket.destroy();resolve(true)})})
  if(listening)throw Error('ranking-pause-api-required')
 }
 const result=command.startsWith('metrics-')?await bootstrapRanking({...options,apply:command==='metrics-prepare'}):command==='build'?await buildRankingGeneration(options):command==='prune'?await pruneRankingGeneration({...options,generationId:id}):await prepareRanking({...options,apply:command==='prepare'})
 console.log(JSON.stringify(result))
}catch(error){const code=error instanceof Error&&/^ranking-[a-z-]+$/.test(error.message)?error.message:'ranking-unavailable';console.error(code);process.exitCode=1}
