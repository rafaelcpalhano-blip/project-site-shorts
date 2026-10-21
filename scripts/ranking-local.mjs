// Manual local commands only. No scheduler, cloud project or public endpoint.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {prepareRanking} from '../server/ranking/prepare.ts'
import {buildRankingGeneration} from '../server/ranking/generation.ts'
import {pruneRankingGeneration} from '../server/ranking/retention.ts'
const [command,id,...extra]=process.argv.slice(2)
if(!['inspect','prepare','build','prune'].includes(command)||extra.length||command!=='prune'&&id!==undefined||command==='prune'&&!/^[a-f0-9]{32}$/.test(id??''))throw Error('Use inspect|prepare|build ou prune ID')
const options={store:createRestStore({projectId:'demo-clipzone',emulatorPort:8080}),now:()=>new Date()}
try{
 const result=command==='build'?await buildRankingGeneration(options):command==='prune'?await pruneRankingGeneration({...options,generationId:id}):await prepareRanking({...options,apply:command==='prepare'})
 console.log(JSON.stringify(result))
}catch(error){const code=error instanceof Error&&/^ranking-[a-z-]+$/.test(error.message)?error.message:'ranking-unavailable';console.error(code);process.exitCode=1}
