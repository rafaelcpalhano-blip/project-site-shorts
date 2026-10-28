import type {AtomicStore} from '../firestore/atomic-store.ts'
import {timestamp} from './metrics.ts'
export interface RankingPilotInput {configuration:unknown;event:unknown}
/** Private scheduled binding only. Expiry is checked before datastore access;
 * attempts are claimed durably before work, including work that later fails. */
export async function claimRankingPilotStep(options:{store:AtomicStore;now:()=>Date;input:RankingPilotInput}){
 const raw=options.input.configuration,event=options.input.event
 if(typeof raw!=='string'||raw.length>512||!event||typeof event!=='object'||Array.isArray(event))throw Error('ranking-invalid-pilot')
 let config:Record<string,unknown>
 try{config=JSON.parse(raw)}catch{throw Error('ranking-invalid-pilot')}
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).sort().join(',')!=='endsAt,id,maximumSteps,startsAt'||typeof config.id!=='string'||!/^[a-f0-9]{32}$/.test(config.id)||typeof config.startsAt!=='string'||typeof config.endsAt!=='string'||!Number.isSafeInteger(config.maximumSteps)||Number(config.maximumSteps)<1||Number(config.maximumSteps)>8)throw Error('ranking-invalid-pilot')
 const start=Date.parse(config.startsAt),end=Date.parse(config.endsAt),point=timestamp(options.now()),metadata=event as Record<string,unknown>,scheduled=metadata.scheduledTime
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end-start>20*60000||metadata.cron!=='* * * * *'||!Number.isSafeInteger(scheduled))throw Error('ranking-invalid-pilot')
 if(point<start||point>=end||Number(scheduled)<start||Number(scheduled)>=end||Number(scheduled)>point)return {allowed:false,status:'outside-window'}
 const path='maintenanceState/rankingPilot-'+config.id
 const claim=await options.store.transact(async tx=>{
  const live=timestamp(options.now());if(live<start||live>=end)return {allowed:false,status:'outside-window'}
  const state=await tx.get(path)
  if(state&&(state.version!==1||state.id!==config.id||state.startsAt!==config.startsAt||state.endsAt!==config.endsAt||state.maximumSteps!==config.maximumSteps||!Number.isSafeInteger(state.attempts)||Number(state.attempts)<1||Number(state.attempts)>Number(config.maximumSteps)||!Number.isSafeInteger(state.lastScheduledTime)||Number(state.lastScheduledTime)<start||Number(state.lastScheduledTime)>=end))throw Error('ranking-invalid-pilot-state')
  if(state&&Number(scheduled)<=Number(state.lastScheduledTime))return {allowed:false,status:'duplicate-or-old-event'}
  if(state&&Number(state.attempts)>=Number(config.maximumSteps))return {allowed:false,status:'step-limit'}
  const attempt=Number(state?.attempts??0)+1
  tx.set(path,{version:1,id:config.id,startsAt:config.startsAt,endsAt:config.endsAt,maximumSteps:config.maximumSteps,attempts:attempt,lastScheduledTime:scheduled,updatedAt:options.now()})
  return {allowed:true,status:'claimed',attempt}
 })
 if(claim.allowed&&timestamp(options.now())>=end)return {allowed:false,status:'outside-window'}
 return claim
}
