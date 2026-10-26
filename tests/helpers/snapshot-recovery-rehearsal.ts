import {verifyFirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'
import type {FirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'
const project='demo-clipzone-tests',resource='projects/'+project+'/databases/(default)/documents'
const endpoint='http://127.0.0.1:8081/v1/'+resource
class RehearsalFailure extends Error {}
const refuse=():never=>{throw new RehearsalFailure('isolated-restore-refused')}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return refuse();return value as Record<string,unknown>}
function exact(value:Record<string,unknown>,keys:string[]){if(Object.keys(value).some(key=>!keys.includes(key)))refuse()}
function stamp(value:unknown){if(typeof value!=='string')return refuse();const m=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.\d{1,9})?Z$/.exec(value);if(!m||!Number.isFinite(Date.parse(m[1]+'Z'))||new Date(Date.parse(m[1]+'Z')).toISOString()!==m[1]+'.000Z')refuse()}
function documentPath(value:string){const parts=value.split('/');if(parts.length%2!==0||parts.some(part=>!part||part==='.'||part==='..'||[...part].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)))refuse()}
function wireFields(input:unknown,depth=0){
 if(depth>20)refuse()
 for(const [name,item] of Object.entries(object(input))){if(!name||/^__.*__$/.test(name)||new TextEncoder().encode(name).length>1500)refuse();wireValue(item,depth,false)}
}
function wireValue(input:unknown,depth:number,inArray:boolean){
 if(depth>20)refuse()
 const row=object(input),keys=Object.keys(row);if(keys.length!==1)refuse();const key=keys[0],value=row[key]
 switch(key){
  case 'nullValue':if(value!==null)refuse();break
  case 'booleanValue':if(typeof value!=='boolean')refuse();break
  case 'stringValue':if(typeof value!=='string')refuse();break
  case 'integerValue':{
   if(typeof value!=='string'||!/^(?:0|-?[1-9]\d*)$/.test(value))return refuse()
   const n=BigInt(value);if(n<-(1n<<63n)||n>(1n<<63n)-1n)refuse();break
  }
  case 'doubleValue':if(!(typeof value==='number'&&Number.isFinite(value))&&!['NaN','Infinity','-Infinity'].includes(String(value)))refuse();break
  case 'timestampValue':{stamp(value);const fraction=(value as string).match(/\.(\d{1,9})Z$/)?.[1]??'';if(BigInt(fraction.padEnd(9,'0'))%1000n!==0n)refuse();break}
  case 'bytesValue':if(typeof value!=='string'||Buffer.from(value,'base64').toString('base64')!==value)refuse();break
  case 'referenceValue':if(typeof value!=='string'||!value.startsWith(resource+'/'))return refuse();documentPath(value.slice(resource.length+1));break
  case 'geoPointValue':{const point=object(value);exact(point,['latitude','longitude']);const {latitude,longitude}=point;if(typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90||typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180)refuse();break}
  case 'mapValue':{const map=object(value);exact(map,['fields']);wireFields(map.fields??{},depth+1);break}
  case 'arrayValue':{if(inArray)refuse();const array=object(value);exact(array,['values']);const values=array.values??[];if(!Array.isArray(values))return refuse();for(const item of values)wireValue(item,depth+1,true);break}
  default:refuse()
 }
}
function canonical(value:unknown):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}'}
export interface RehearsalOptions {emulatorHost:string;targetProjectId:string;writersStopped:boolean;syntheticFixture:boolean;maxDocuments:number}
/** TEST HARNESS ONLY: no production target, credentials, default fetch, CLI or runtime import.
 * The syntheticFixture flag is an explicit caller assertion, not proof of provenance.
 * Existing metadata timestamps are output-only and are deliberately not sent as fields.
 */
export async function planIsolatedRestore(input:FirestoreSnapshot,options:RehearsalOptions){
 try{
  if(options.emulatorHost!=='127.0.0.1:8081'||options.targetProjectId!==project||options.writersStopped!==true||options.syntheticFixture!==true||!Number.isSafeInteger(options.maxDocuments)||options.maxDocuments<1||options.maxDocuments>100)refuse()
  const snapshot=structuredClone(input)
  await verifyFirestoreSnapshot(snapshot,{projectId:project,databaseId:'(default)'})
  if(snapshot.documents.length<1||snapshot.documents.length>options.maxDocuments)refuse()
  for(const row of snapshot.documents)wireFields(row.fields)
  const writes=snapshot.documents.map(row=>({update:{name:resource+'/'+row.path,fields:row.fields},currentDocument:{exists:false as const}}))
  if(new TextEncoder().encode(JSON.stringify({writes})).length>1048576)refuse()
  return {writes,sourceSha256:snapshot.sha256,missingParentsNotCreated:snapshot.missingParentPaths.length,metadataTimestampsRecreated:true as const}
 }catch{return refuse()}
}
/** Three bounded logical calls: inspect empty target, one atomic create-only commit, verify raw fields.
 * Writers must be stopped by the isolated test runner; preinspection alone is not a lock.
 * Never retries, overwrites or deletes. An ambiguous commit is explicitly not called a failure-with-no-writes.
 */
export async function rehearseIsolatedRestore(input:FirestoreSnapshot,options:RehearsalOptions&{fetcher:typeof fetch}){
 let phase:'prepare'|'commit'|'verify'='prepare'
 try{
  if(typeof options.fetcher!=='function')refuse()
  const plan=await planIsolatedRestore(input,options)
  const call=async(operation:string,body:unknown)=>{
   const response=await options.fetcher(endpoint+':'+operation,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)})
   if(!response.ok){await response.body?.cancel();throw new RehearsalFailure(phase==='commit'?([400,401,403,404,409,412,429].includes(response.status)?'isolated-restore-commit-rejected':'isolated-restore-outcome-unknown'):phase==='verify'?'isolated-restore-verification-failed':'isolated-restore-refused')}
   if(!response.headers.get('content-type')?.startsWith('application/json'))refuse()
   return response.json() as Promise<unknown>
  }
  const inspection=object(await call('listCollectionIds',{pageSize:100}));exact(inspection,['collectionIds','nextPageToken'])
  if(inspection.nextPageToken||inspection.collectionIds!==undefined&&(!Array.isArray(inspection.collectionIds)||inspection.collectionIds.length!==0))refuse()
  phase='commit'
  const committed=object(await call('commit',{writes:plan.writes}));exact(committed,['writeResults','commitTime'])
  if(!Array.isArray(committed.writeResults)||committed.writeResults.length!==plan.writes.length)throw new RehearsalFailure('isolated-restore-outcome-unknown')
  stamp(committed.commitTime)
  phase='verify'
  const expected=new Map(plan.writes.map(write=>[write.update.name,write.update.fields]))
  const result=await call('batchGet',{documents:[...expected.keys()]})
  if(!Array.isArray(result))throw new RehearsalFailure('isolated-restore-verification-failed')
  const found=new Set<string>()
  for(const raw of result){const row=object(raw);exact(row,['found','missing','readTime']);if(!row.found){if(row.missing||!row.readTime)throw new RehearsalFailure('isolated-restore-verification-failed');stamp(row.readTime);continue}const doc=object(row.found);exact(doc,['name','fields','createTime','updateTime']);stamp(doc.createTime);stamp(doc.updateTime);if(row.missing||typeof doc.name!=='string'||!expected.has(doc.name)||found.has(doc.name)||canonical(doc.fields??{})!==canonical(expected.get(doc.name)))throw new RehearsalFailure('isolated-restore-verification-failed');found.add(doc.name)}
  if(found.size!==expected.size)throw new RehearsalFailure('isolated-restore-verification-failed')
  return {verifiedDocuments:found.size,sourceSha256:plan.sourceSha256,createOnly:true,missingParentsNotCreated:plan.missingParentsNotCreated,metadataTimestampsRecreated:true,productionRestoreSupported:false}
 }catch(error){if(error instanceof RehearsalFailure&&['isolated-restore-commit-rejected','isolated-restore-outcome-unknown','isolated-restore-verification-failed'].includes(error.message))throw error;throw new RehearsalFailure(phase==='commit'?'isolated-restore-outcome-unknown':phase==='verify'?'isolated-restore-verification-failed':'isolated-restore-refused')}
}
