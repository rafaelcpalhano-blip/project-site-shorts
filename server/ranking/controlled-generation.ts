import type {AtomicStore,AtomicTransaction} from '../firestore/atomic-store.ts'
import {stepRankingGeneration} from './segmented-generation.ts'

/** Operator-only bounded pilot; never wired to visitor HTTP or a scheduler.
 * It may leave private staging on interruption. It never repairs primary data. */
export async function runControlledRanking(options:{store:AtomicStore;now:()=>Date;maximumSteps?:number;maximumWrites?:number;maximumSources?:number;maximumVideos?:number}){
 const {store,now}=options,limits={steps:options.maximumSteps??8,writes:options.maximumWrites??60,sources:options.maximumSources??30,videos:options.maximumVideos??15}
 for(const [key,max]of Object.entries({steps:8,writes:60,sources:30,videos:15}))if(!Number.isSafeInteger(limits[key as keyof typeof limits])||limits[key as keyof typeof limits]<1||limits[key as keyof typeof limits]>max)throw Error('ranking-operator-invalid-limit')
 if(!store.get||!store.rankingSourcePage||!store.snapshotGet)throw Error('ranking-store-unavailable')
 const started=now(),day=started.toISOString().slice(0,10),state=await store.get('rankingState/build')
 if(state&&['scan','stage'].includes(String(state.phase)))throw Error('ranking-operator-existing-build')
 let attemptedWrites=0,sources=0,videos=0,generationId:string|undefined
 const steps:Array<{status:string;generationId?:string}>=[]
 const allowed=(p:string)=>/^rankingState\/(?:current|build|lease)$/.test(p)||p==='rankingBudgets/'+day||/^rankingRuns\/[a-f0-9]{32}$/.test(p)||/^rankingItems\/[a-f0-9]{32}_[-_a-zA-Z0-9]{1,128}$/.test(p)
 const writable:AtomicStore={...store,
  get:async p=>{const row=await store.get!(p);if(p==='rankingState/build'&&!generationId&&row&&['scan','stage'].includes(String(row.phase)))throw Error('ranking-operator-existing-build');return row},
  rankingSourcePage:async(...args)=>{const p=await store.rankingSourcePage!(...args);sources+=p.items.length;if(sources>limits.sources)throw Error('ranking-operator-source-limit');return p},
  ...(store.rankingSnapshotGetMany?{rankingSnapshotGetMany:async(paths:string[],point:string)=>{videos+=paths.filter(p=>p.startsWith('rankingMetrics/')).length;if(videos>limits.videos)throw Error('ranking-operator-video-limit');return store.rankingSnapshotGetMany!(paths,point)}}:{}),
  snapshotGet:async(p,point)=>{if(p.startsWith('rankingMetrics/')&&++videos>limits.videos)throw Error('ranking-operator-video-limit');return store.snapshotGet!(p,point)},
  transact:work=>store.transact(async tx=>{
   const write=(p:string)=>{if(!allowed(p))throw Error('ranking-operator-write-refused');if(++attemptedWrites>limits.writes)throw Error('ranking-operator-write-limit')}
   const guarded:AtomicTransaction={get:p=>tx.get(p),set:(p,data)=>{write(p);tx.set(p,data)},create:(p,data)=>{write(p);tx.create(p,data)},delete:()=>{throw Error('ranking-operator-delete-refused')}}
   return work(guarded)
  }),
 }
 for(let n=0;n<limits.steps;n++){
  const at=now();if(at.getTime()<started.getTime()||at.getTime()-started.getTime()>120000||at.toISOString().slice(0,10)!==day)throw Error('ranking-operator-time-limit')
  if(generationId){const saved=await store.get('rankingState/build');if(saved?.id!==generationId)throw Error('ranking-operator-generation-changed')}
  const result=await stepRankingGeneration({store:writable,now});steps.push(result)
  if(result.status==='busy')return {status:'stopped',reason:'concurrent-build',steps,attemptedWrites,sources,videos}
  if(result.status==='not-due')return {status:'not-due',steps,attemptedWrites,sources,videos}
  if(typeof result.generationId!=='string'||!/^[a-f0-9]{32}$/.test(result.generationId))throw Error('ranking-operator-invalid-result')
  if(!generationId)generationId=result.generationId
  if(result.generationId!==generationId)throw Error('ranking-operator-generation-changed')
  if(result.status==='ready'){if(!('itemCount' in result)||!Number.isSafeInteger(result.itemCount))throw Error('ranking-operator-invalid-result');return {status:'ready',generationId,itemCount:Number(result.itemCount),steps,attemptedWrites,sources,videos}}
 }
 return {status:'stopped',reason:'step-limit',generationId,steps,attemptedWrites,sources,videos}
}
