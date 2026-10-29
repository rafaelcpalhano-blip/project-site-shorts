import {inspectAuxiliaryRetention} from './inspect-retention.ts'

const root='projects/clipzone-db02a/databases/(default)/documents'
const endpoint='https://firestore.googleapis.com/v1/'+root+':runQuery'
const maxBytes=131072
function failed():never {throw Error('network-retention-inspection-not-verified')}
async function bounded<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted()
 let stop:()=>void=()=>{}
 const aborted=new Promise<never>((_,reject)=>{stop=()=>reject(Error('inspection-aborted'));signal.addEventListener('abort',stop,{once:true})})
 try{return await Promise.race([promise,aborted])}finally{signal.removeEventListener('abort',stop)}
}
/** Single-use, fixed-target, projected read. No credentials or default fetch.
 * One POST runQuery, <=30 expiry timestamps, <=128 KiB response, 30s signal.
 * OAuth requests are separate and must be bounded by the supplied token adapter. */
export function createNetworkRetentionInspection(options:{fetcher:typeof fetch;getAccessToken:(signal:AbortSignal)=>Promise<string>;now:()=>Date;signal:AbortSignal}){
 if(typeof options.fetcher!=='function'||typeof options.getAccessToken!=='function'||typeof options.now!=='function'||!(options.signal instanceof AbortSignal))return failed()
 const {fetcher,getAccessToken,now,signal:outer}=options
 let used=false
 return async()=>{
  if(used)return failed()
  used=true
  const signal=AbortSignal.any([outer,AbortSignal.timeout(30000)])
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined
  try{
   signal.throwIfAborted()
   const at=now().getTime()
   if(!Number.isSafeInteger(at)||at<0)return failed()
   const token=await bounded(getAccessToken(signal),signal);signal.throwIfAborted()
   if(typeof token!=='string'||!token||token.length>16384||/[\s\p{C}]/u.test(token))return failed()
   const response=await bounded(fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',signal,
    headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({structuredQuery:{from:[{collectionId:'networkAbuse'}],select:{fields:[{fieldPath:'expiresAt'}]},where:{fieldFilter:{field:{fieldPath:'expiresAt'},op:'LESS_THAN_OR_EQUAL',value:{timestampValue:new Date(at).toISOString()}}},orderBy:[{field:{fieldPath:'expiresAt'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30}}),
   }),signal)
   if(!response.ok||response.redirected||!response.body||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'')){void response.body?.cancel().catch(()=>{});return failed()}
   const length=response.headers.get('content-length')
   if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){void response.body.cancel().catch(()=>{});return failed()}
   reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0
   while(true){const part=await bounded(reader.read(),signal);signal.throwIfAborted();if(part.done)break;size+=part.value.byteLength;if(size>maxBytes)return failed();chunks.push(part.value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
   const decoded:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
   if(!Array.isArray(decoded)||decoded.length>31)return failed()
   const rows:Array<{id:string;data:{expiresAt:Date}}>=[]
   for(const frame of decoded){
    if(!frame||typeof frame!=='object'||Array.isArray(frame)||'error' in frame)return failed()
    if(!frame.document){if(typeof frame.readTime!=='string'||!Number.isFinite(Date.parse(frame.readTime))||Object.keys(frame).some(k=>!['readTime','skippedResults'].includes(k)))return failed();continue}
    const doc=frame.document,prefix=root+'/networkAbuse/'
    if(typeof doc.name!=='string'||!doc.name.startsWith(prefix)||!/^[a-f0-9]{64}$/.test(doc.name.slice(prefix.length))||!doc.fields||Object.keys(doc.fields).length!==1||!doc.fields.expiresAt||Object.keys(doc.fields.expiresAt).length!==1||typeof doc.fields.expiresAt.timestampValue!=='string')return failed()
    const expiresAt=new Date(doc.fields.expiresAt.timestampValue)
    if(!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()>at)return failed()
    rows.push({id:doc.name.slice(prefix.length),data:{expiresAt}})
   }
   if(rows.length>30)return failed()
   const summary=await inspectAuxiliaryRetention({collection:'networkAbuse'},{store:{expiredNetworkRecords:async()=>rows},now:()=>new Date(at),signal})
   signal.throwIfAborted()
   return {...summary,httpRequests:1,responseBytes:size,responseByteCeiling:maxBytes,projectId:'clipzone-db02a',databaseId:'(default)',projection:['expiresAt']}
  }catch{return failed()}
  finally{if(reader){void reader.cancel().catch(()=>{});reader.releaseLock()}}
 }
}
