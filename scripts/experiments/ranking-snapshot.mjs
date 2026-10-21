// Isolated 8081 proof only. Never imported by the application or used against cloud.
import {createRestStore} from '../../server/firestore/rest-store.ts'
const projectId='demo-clipzone-tests',root='projects/'+projectId+'/databases/(default)/documents',collection='rankingExperiments'
const orders={latest:[['createdAt','DESCENDING'],['__name__','DESCENDING']],oldest:[['createdAt','ASCENDING'],['__name__','ASCENDING']],likes:[['likes','DESCENDING'],['createdAt','DESCENDING'],['__name__','DESCENDING']],relevant:[['score','DESCENDING'],['createdAt','DESCENDING'],['__name__','DESCENDING']]}
const id=value=>{if(typeof value!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(value))throw Error('invalid-id');return value}
const recordName=value=>root+'/'+collection+'/'+id(value)
const decode=value=>'integerValue'in value?Number(value.integerValue):'doubleValue'in value?value.doubleValue:'timestampValue'in value?value.timestampValue:value.stringValue
export function createSnapshotProbe({now=()=>Date.now()}={}){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw Error('Somente emulador isolado 8081')
 const store=createRestStore({projectId,emulatorPort:8081}),stats={queryDocuments:0,currentShortReads:0,currentGameReads:0,queries:0}
 const resetStats=()=>{for(const key of Object.keys(stats))stats[key]=0}
 async function query({mode='latest',gameId,cursor,readTime,limit=15}={}){
  if(!Object.hasOwn(orders,mode)||limit!==15)throw Error('invalid-query')
  if(gameId!==undefined)id(gameId)
  const scope=mode+':'+(gameId??'*'),point=cursor?.readTime??readTime
  if(cursor&&(cursor.scope!==scope||!Array.isArray(cursor.values)||cursor.values.length!==orders[mode].length||typeof point!=='string'))throw Error('invalid-cursor')
  if(point!==undefined&&(typeof point!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(point)||!Number.isFinite(Date.parse(point))||Date.parse(point)>now()+1000||now()-Date.parse(point)>=30*60000))throw Error('snapshot-expired')
  if(cursor){const last=cursor.values.at(-1);if(typeof last?.referenceValue!=='string'||!last.referenceValue.startsWith(root+'/'+collection+'/'))throw Error('invalid-cursor');id(last.referenceValue.split('/').at(-1))}
  const filters=[{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'published'}}},...(gameId?[{fieldFilter:{field:{fieldPath:'gameId'},op:'EQUAL',value:{stringValue:gameId}}}]:[])]
  const response=await fetch('http://127.0.0.1:8081/v1/'+root+':runQuery',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:collection}],select:{fields:['score','likes','createdAt','gameId','status'].map(fieldPath=>({fieldPath}))},where:{compositeFilter:{op:'AND',filters}},orderBy:orders[mode].map(([fieldPath,direction])=>({field:{fieldPath},direction})),limit,...(cursor?{startAt:{before:false,values:cursor.values}}:{})},...(point?{readTime:point}:{})}),signal:AbortSignal.timeout(15000)})
  const result=await response.json()
  if(!response.ok)throw Error(JSON.stringify({status:response.status,error:result.error?.status,message:result.error?.message}))
  const raw=Array.isArray(result)?result:[result],documents=raw.filter(row=>row.document).map(row=>row.document),instant=point??raw.find(row=>row.readTime)?.readTime
  if(!instant)throw Error('missing-read-time')
  stats.queries++;stats.queryDocuments+=Math.max(documents.length,1)
  const items=documents.map(doc=>({id:doc.name.split('/').at(-1),data:Object.fromEntries(Object.entries(doc.fields).map(([key,value])=>[key,decode(value)]))}))
  const last=documents.at(-1),next=documents.length===15?{scope,readTime:instant,values:orders[mode].map(([field])=>field==='__name__'?{referenceValue:recordName(last.name.split('/').at(-1))}:last.fields[field])}:null
  return {items,next,readTime:instant}
 }
 async function visiblePage(input={}){
  const items=[],games=new Map();let cursor=input.cursor,readTime=input.readTime,next=null,examined=0
  while(examined<30&&items.length<15){
   const page=await query({...input,cursor,readTime});readTime=page.readTime
   for(let i=0;i<page.items.length;i++){
    const row=page.items[i];examined++;stats.currentShortReads++
    const current=await store.get(collection+'/'+row.id)
    // The snapshot controls ordering, never current moderation or current visibility.
    if(current?.status==='published'&&(!input.gameId||current.gameId===input.gameId)&&typeof current.gameId==='string'){
     if(!games.has(current.gameId)){stats.currentGameReads++;games.set(current.gameId,await store.get('rankingGames/'+id(current.gameId)))}
     if(games.get(current.gameId)?.status==='active')items.push(row.id)
    }
    if(items.length===15){
     const fields=orders[input.mode??'latest'].map(([field])=>field==='__name__'?{referenceValue:recordName(row.id)}:field==='createdAt'?{timestampValue:row.data.createdAt}:Number.isInteger(row.data[field])?{integerValue:String(row.data[field])}:{doubleValue:row.data[field]})
     next=i<page.items.length-1||page.next?{scope:(input.mode??'latest')+':'+(input.gameId??'*'),readTime,values:fields}:null
     break
    }
   }
   if(items.length===15)break
   next=page.next
   if(!next)break
   cursor=next
  }
  return {items,next,readTime,examined,limited:examined===30}
 }
 return {query,visiblePage,stats,resetStats,store}
}
