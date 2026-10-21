// Experimental model only: no application imports, persistence or public endpoints.
export const parameters=Object.freeze({publication:2,like:1,comment:0.25,newGameBonus:0.3,newGameHours:168,halfLifeHours:24,likesPerHour:20,commentsPerHour:10,commentsPerIdentityDay:1})
const validTime=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0
function evaluateModel({publishedAt,gameCreatedAt,now,signals=[]},halfLives){
 if(!validTime(now)||!validTime(publishedAt)||!validTime(gameCreatedAt)||publishedAt>now||gameCreatedAt>publishedAt||!Array.isArray(signals))throw Error('invalid-experiment')
 const canonical=new Map()
 for(const signal of signals){
  if(!signal||!['like','comment'].includes(signal.kind)||typeof signal.id!=='string'||!signal.id||typeof signal.identity!=='string'||!signal.identity||!validTime(signal.at)||signal.at<publishedAt||signal.at>now||typeof signal.accepted!=='boolean'||typeof signal.active!=='boolean'||signal.active&&!signal.accepted)throw Error('invalid-signal')
  const key=signal.kind+':'+signal.id,previous=canonical.get(key)
  if(previous&&['identity','at','accepted','active'].some(field=>previous[field]!==signal[field]))throw Error('conflicting-signal')
  canonical.set(key,signal)
 }
 const buckets=new Map(),identities=new Set(),dailyComments=new Set(),admitted=[],suppressed={unaccepted:0,identity:0,hour:0}
 for(const signal of [...canonical.values()].sort((a,b)=>a.at-b.at||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id))){
  if(!signal.accepted){suppressed.unaccepted++;continue}
  const identityKey=signal.kind+':'+signal.identity
  if(signal.kind==='like'&&identities.has(identityKey)){suppressed.identity++;continue}
  if(signal.kind==='like')identities.add(identityKey)
  const dayKey=signal.identity+':'+Math.floor(signal.at/24)
  if(signal.kind==='comment'&&dailyComments.has(dayKey)){suppressed.identity++;continue}
  const key=signal.kind+':'+Math.floor(signal.at),used=buckets.get(key)??0,cap=signal.kind==='like'?parameters.likesPerHour:parameters.commentsPerHour
  if(used>=cap){suppressed.hour++;continue}
  buckets.set(key,used+1)
  if(signal.kind==='comment')dailyComments.add(dayKey)
  // Inactive admitted records still consume admission budget, preventing slot recycling.
  admitted.push(signal)
 }
 const bonus=publishedAt-gameCreatedAt<parameters.newGameHours?parameters.newGameBonus:0
 const terms=[{kind:'publication',weight:parameters.publication,at:publishedAt},...(bonus?[{kind:'bonus',weight:bonus,at:publishedAt}]:[]),...admitted.filter(signal=>signal.active).map(signal=>({kind:signal.kind,weight:parameters[signal.kind],at:signal.at}))]
 const logs=terms.map(term=>Math.log2(term.weight)-(now-term.at)/halfLives[term.kind]),largest=Math.max(...logs)
 const logScore=largest+Math.log2(logs.reduce((sum,value)=>sum+2**(value-largest),0))
 const key=new Set(Object.values(halfLives)).size===1?logScore+now/halfLives.publication:null
 const score=2**logScore
 return {score,key,bonus,admitted:admitted.length,active:admitted.filter(signal=>signal.active).length,suppressed}
}
export function evaluateRanking(input){return evaluateModel(input,{publication:24,like:24,comment:24,bonus:24})}
export function evaluateMixedRanking(input){return evaluateModel(input,{publication:24,like:12,comment:12,bonus:6})}
export function estimateSnapshotRefresh({videos,generationsPerDay=24}={}){
 if(!Number.isSafeInteger(videos)||videos<0||!Number.isSafeInteger(generationsPerDay)||generationsPerDay<1||generationsPerDay>1440)throw Error('invalid-refresh-budget')
 return {videos,generationsPerDay,minimumReads:videos*generationsPerDay,minimumWrites:(videos+1)*generationsPerDay,steadyStateDeletes:videos*generationsPerDay}
}
export function estimatePage({candidates=15,distinctGames=candidates,emptyQueries=candidates?0:1}={}){
 const queryCalls=(candidates?Math.ceil(candidates/15):0)+emptyQueries
 if(!Number.isSafeInteger(candidates)||candidates<0||candidates>30||!Number.isSafeInteger(distinctGames)||distinctGames<0||distinctGames>candidates||!Number.isSafeInteger(emptyQueries)||emptyQueries<0||queryCalls<1||queryCalls>2)throw Error('invalid-budget')
 return {candidates,currentShortReads:candidates,currentGameReads:distinctGames,documentReads:candidates+emptyQueries+candidates+distinctGames+1,limiterWrites:1}
}
export function fixtures(){
 const now=240,oldGame=0,like=(n,at,identity='v'+n)=>({kind:'like',id:'l'+n,identity,at,accepted:true,active:true}),comment=(n,at,identity='c'+n)=>({kind:'comment',id:'c'+n,identity,at,accepted:true,active:true})
 return [
  {name:'Novo sem interações',publishedAt:now,gameCreatedAt:oldGame,now},
  {name:'Jogo novo, sem interações',publishedAt:now,gameCreatedAt:now-1,now},
  {name:'Pico antigo: 1.000 curtidas há 7 dias',publishedAt:now-168,gameCreatedAt:oldGame,now,signals:Array.from({length:1000},(_,n)=>like(n,now-168))},
  {name:'Pico recente: 20 curtidas há 10 minutos',publishedAt:now-24,gameCreatedAt:oldGame,now,signals:Array.from({length:20},(_,n)=>like(n,now-1/6))},
  {name:'Interesse contínuo: 10/h nas últimas 6 horas',publishedAt:now-24,gameCreatedAt:oldGame,now,signals:Array.from({length:60},(_,n)=>like(n,now-5.9+Math.floor(n/10)))},
  {name:'Tentativa: 500 repetições de uma identidade',publishedAt:now-1,gameCreatedAt:oldGame,now,signals:Array.from({length:500},(_,n)=>like(n,now-0.5,'same'))},
  {name:'Tentativa: 500 identidades novas em uma hora',publishedAt:now-1,gameCreatedAt:oldGame,now,signals:Array.from({length:500},(_,n)=>like(n,now-0.5))},
  {name:'Comentários publicados: 10 identidades',publishedAt:now-1,gameCreatedAt:oldGame,now,signals:Array.from({length:10},(_,n)=>comment(n,now-0.5))},
  {name:'Comentários: 100 de uma identidade',publishedAt:now-1,gameCreatedAt:oldGame,now,signals:Array.from({length:100},(_,n)=>comment(n,now-0.5,'same'))},
  {name:'Pendentes/rejeitados: 100 comentários',publishedAt:now-1,gameCreatedAt:oldGame,now,signals:Array.from({length:100},(_,n)=>({...comment(n,now-0.5),accepted:false,active:false}))},
  {name:'Ataque distribuído: 20 identidades/h por 24h',publishedAt:now-24,gameCreatedAt:oldGame,now,signals:Array.from({length:480},(_,n)=>like(n,now-23.9+Math.floor(n/20)))},
 ]
}
