import type {AtomicTransaction,RecordData} from '../firestore/atomic-store.ts'
import {generationLimits} from './generation.ts'
import {timestamp} from './metrics.ts'
export const rankingBackpressureLimits=Object.freeze({maximumRetainedGenerations:6,recheckMs:15*60000,readReservation:36,writeReservation:3})
/** Read-only preparation inside the same transaction that may start a build.
 * Reservations and admission are committed together only after all checks. */
export async function prepareAtomicRankingAdmission(tx:AtomicTransaction,state:RecordData|null,budget:RecordData|null,now:Date){
 if(!tx.rankingRunIds)throw Error('ranking-atomic-admission-unavailable')
 if(rankingAdmissionWaiting(state,now))return {waiting:true as const}
 if(budget&&budget.version!==1)throw Error('ranking-invalid-budget')
 const amount=(key:string)=>{const n=budget?budget[key]:0;if(!Number.isSafeInteger(n)||Number(n)<0)throw Error('ranking-invalid-budget');return Number(n)}
 const reads=amount('readsReserved'),writes=amount('writesReserved'),deletes=amount('deletesReserved')
 if(reads+rankingBackpressureLimits.readReservation>generationLimits.dailyReads||writes+rankingBackpressureLimits.writeReservation>generationLimits.dailyWrites)throw Error('ranking-budget-exhausted')
 const ids=await tx.rankingRunIds(6);let prior=''
 if(!Array.isArray(ids)||ids.length>6)throw Error('ranking-invalid-cleanup-page')
 for(const id of ids){if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id)||id<=prior)throw Error('ranking-invalid-cleanup-page');prior=id}
 const allowed=ids.length<rankingBackpressureLimits.maximumRetainedGenerations
 return {waiting:false as const,allowed,state:{version:1,nonce:crypto.randomUUID().replaceAll('-',''),allowed,checkedAt:now,observedRuns:ids.length},budget:{version:1,readsReserved:reads+rankingBackpressureLimits.readReservation,writesReserved:writes+rankingBackpressureLimits.writeReservation,deletesReserved:deletes,updatedAt:now}}
}

/** A fresh negative check may stop a read-only tick before loading build metadata. */
export function rankingAdmissionWaiting(state:RecordData|null,now:Date):boolean{
 const point=timestamp(now)
 if(state&&(state.version!==1||typeof state.allowed!=='boolean'||typeof state.nonce!=='string'||!/^[a-f0-9]{32}$/.test(state.nonce)||!(state.checkedAt instanceof Date)||timestamp(state.checkedAt)>point))throw Error('ranking-invalid-admission')
 return !!state&&!state.allowed&&point-timestamp(state.checkedAt)<rankingBackpressureLimits.recheckMs
}
