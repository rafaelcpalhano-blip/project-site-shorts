// Loopback development only. No cloud scheduler or visitor-triggered generation.
import {buildRankingGeneration} from '../server/ranking/generation.ts'
import {pruneRankingGeneration} from '../server/ranking/retention.ts'
export async function startLocalRanking(options){
 let running=false,stopped=false,timer
 const schedule=delay=>{if(!stopped){timer=setTimeout(()=>void tick(),delay);timer.unref()}}
 const tick=async()=>{
  if(running||stopped)return
  running=true
  let delay=3600000
  try{
   const marker=await options.store.get('rankingState/metrics')
   if(marker?.ready!==true)return
   const before=await options.store.get('rankingState/current'),result=await buildRankingGeneration(options)
   if(result.status==='not-due'&&before?.publishedAt instanceof Date)delay=Math.max(1000,before.publishedAt.getTime()+3600000-options.now().getTime())
   if(result.status==='ready'){
    console.log('Ranking local: geração completa publicada ('+result.itemCount+' shorts).')
    const obsolete=before?.previousGenerationId
    if(typeof obsolete==='string')for(let page=0;page<4;page++){
     try{const result=await pruneRankingGeneration({...options,generationId:obsolete});if(result.complete)break}catch{console.log('Ranking local: manutenção adiada; geração válida preservada.');break}
    }
   }
  }catch(error){const code=error instanceof Error&&/^ranking-[a-z-]+$/.test(error.message)?error.message:'ranking-unavailable';console.log('Ranking local: '+code+'. Sem publicação parcial.')}
  finally{running=false;schedule(delay)}
 }
 await tick()
 return ()=>{stopped=true;clearTimeout(timer)}
}
