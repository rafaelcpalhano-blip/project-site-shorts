import type {AtomicTransaction,RecordData} from '../firestore/atomic-store.ts'
const stamp=(value:unknown)=>{if(!(value instanceof Date)||!Number.isSafeInteger(value.getTime())||value.getTime()<0)throw Error('ranking-invalid-date');return value.getTime()}
const count=(value:unknown)=>{if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('ranking-invalid-counter');return Number(value)}
const hash=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('')
export function emptyRankingMetric(shortId:string,gameId:string,at:Date,epoch:string){return {version:1,ready:true,epoch,shortId,gameId,asOf:at,likeMass:0,commentMass:0,likeContributors:0,commentContributors:0}}
export async function prepareEngagement(tx:AtomicTransaction,input:{shortId:string;gameId:string;kind:'like'|'comment';sourceId:string;identity?:string;at:Date;now:Date;active:boolean;bootstrapEpoch?:string}){
 if(tx.experimentalRankingDisabled)return ()=>{}
 const marker=await tx.get('rankingState/metrics')
 if(!marker||marker.ready!==true&&!input.bootstrapEpoch)return ()=>{}
 if(marker.version!==1||typeof marker.epoch!=='string'||!/^[a-f0-9]{32}$/.test(marker.epoch)||input.bootstrapEpoch&&input.bootstrapEpoch!==marker.epoch)throw Error('ranking-metrics-not-ready')
 const point=stamp(input.now);let at=stamp(input.at)
 if(at>point)throw Error('ranking-invalid-date')
 const signalId=await hash(marker.epoch+':'+input.kind+':'+input.sourceId),path='rankingSignals/'+signalId
 const metric=await tx.get('rankingMetrics/'+input.shortId),previous=await tx.get(path)
 if(metric?.version!==1||metric.ready!==true||metric.epoch!==marker.epoch||metric.shortId!==input.shortId||metric.gameId!==input.gameId||stamp(metric.asOf)>point)throw Error('ranking-metrics-not-ready')
 let admitted=false,guard:RecordData|null=null,day:RecordData|null=null,guardPath='',dayPath=''
 if(previous){
  if(previous.version!==1||previous.shortId!==input.shortId||previous.kind!==input.kind||previous.epoch!==marker.epoch||stamp(previous.at)>point||typeof previous.active!=='boolean'||typeof previous.admitted!=='boolean')throw Error('ranking-invalid-signal')
  // The original signal survives inactive-like source retention; reliking never refreshes its age.
  at=stamp(previous.at);admitted=previous.admitted
 }else if(input.active||input.bootstrapEpoch){
  const identityValid=typeof input.identity==='string'&&/^[a-f0-9]{64}$/.test(input.identity)
  if(identityValid){
   guardPath='rankingHours/'+await hash(marker.epoch+':'+input.shortId+':'+Math.floor(at/3600000));guard=await tx.get(guardPath)
   if(input.kind==='comment'){dayPath='rankingDays/'+await hash(marker.epoch+':'+input.shortId+':'+input.identity+':'+Math.floor(at/86400000));day=await tx.get(dayPath)}
   const used=guard?count(guard[input.kind]):0
   if(day&&day.used!==true)throw Error('ranking-invalid-counter')
   admitted=used<(input.kind==='like'?20:10)&&!day
  }
 }
 const before=previous?.admitted===true&&previous.active===true?1:0,after=admitted&&input.active?1:0,delta=after-before
 const elapsed=(point-stamp(metric.asOf))/3600000,decay=2**(-elapsed/12),weight=2**(-(point-at)/3600000/12)
 let likeMass=Number(metric.likeMass)*decay,commentMass=Number(metric.commentMass)*decay,likes=count(metric.likeContributors),comments=count(metric.commentContributors)
 if(!Number.isFinite(likeMass)||likeMass<0||!Number.isFinite(commentMass)||commentMass<0)throw Error('ranking-invalid-metrics')
 if(input.kind==='like'){likeMass+=delta*weight;likes+=delta}else{commentMass+=delta*weight;comments+=delta}
 if(likes<0||comments<0||likeMass < -1e-8||commentMass < -1e-8)throw Error('ranking-invalid-metrics')
 likeMass=likes===0?0:Math.max(0,likeMass);commentMass=comments===0?0:Math.max(0,commentMass)
 return ()=>{
  if(!previous&&admitted){
   const updated={version:1,epoch:marker.epoch,like:guard?count(guard.like):0,comment:guard?count(guard.comment):0,createdAt:guard?.createdAt??input.now}
   updated[input.kind]++
   tx.set(guardPath,updated)
   if(dayPath)tx.create(dayPath,{version:1,used:true,epoch:marker.epoch,createdAt:input.now})
  }
  tx.set(path,{version:1,epoch:marker.epoch,shortId:input.shortId,kind:input.kind,at:new Date(at),admitted,active:input.active,changedAt:input.now})
  tx.set('rankingMetrics/'+input.shortId,{...metric,asOf:input.now,likeMass,commentMass,likeContributors:likes,commentContributors:comments})
 }
}
