import type {RecordData} from '../firestore/atomic-store.ts'
import {likeCount} from '../likes/short-likes.ts'
export const rankingVersion=1
export function timestamp(value:unknown):number {
 if(!(value instanceof Date)||!Number.isSafeInteger(value.getTime())||value.getTime()<0)throw Error('ranking-invalid-date')
 return value.getTime()
}
export function rankingScore(short:RecordData,game:RecordData,metric:RecordData|null,shortId:string,at:Date){
 if(!metric||metric.version!==rankingVersion||metric.ready!==true)throw Error('ranking-metrics-not-ready')
 const point=timestamp(at),published=timestamp(short.createdAt),registered=timestamp(game.createdAt),measured=timestamp(metric.asOf)
 if(metric.shortId!==shortId||metric.gameId!==short.gameId||published>point||registered>published||measured<published||measured>point||typeof metric.likeMass!=='number'||!Number.isFinite(metric.likeMass)||metric.likeMass<0||metric.likeMass>likeCount(short.likeCount)+1e-8||typeof metric.commentMass!=='number'||!Number.isFinite(metric.commentMass)||metric.commentMass<0||!Number.isSafeInteger(metric.commentContributors)||Number(metric.commentContributors)<0||metric.commentMass>Number(metric.commentContributors)+1e-8)throw Error('ranking-invalid-metrics')
 const hours=(point-published)/3600000,since=(point-measured)/3600000,bonus=published-registered<7*86400000?0.3:0
 const score=2*2**(-hours/24)+(metric.likeMass+0.25*metric.commentMass)*2**(-since/12)+bonus*2**(-hours/6)
 if(!Number.isFinite(score)||score<0)throw Error('ranking-invalid-score')
 return score
}
