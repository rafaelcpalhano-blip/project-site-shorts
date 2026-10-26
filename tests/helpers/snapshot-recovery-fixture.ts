import {captureFirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'
export const recoveryResource='projects/demo-clipzone-tests/databases/(default)/documents'
export const recoveryOptions={emulatorHost:'127.0.0.1:8081',targetProjectId:'demo-clipzone-tests',writersStopped:true,syntheticFixture:true,maxDocuments:100}
const at='2020-01-01T12:00:00Z',created='2019-01-01T00:00:00Z',updated='2020-01-01T11:59:59.123456789Z'
export async function recoveryFixture(fields?:Record<string,unknown>){
 const records:Record<string,Record<string,unknown>>={
  'games/g1':fields??{name:{stringValue:'Jogo fictício'},large:{integerValue:'9223372036854775807'},small:{integerValue:'-9223372036854775808'},at:{timestampValue:'2020-01-01T11:59:59.123456Z'},yes:{booleanValue:true},none:{nullValue:null},ratio:{doubleValue:1.25},blob:{bytesValue:'AQID'},point:{geoPointValue:{latitude:-23.55,longitude:-46.63}},nested:{mapValue:{fields:{list:{arrayValue:{values:[{stringValue:'fixture'},{integerValue:'7'}]}}}}}},
  'shorts/s1':{game:{referenceValue:recoveryResource+'/games/g1'}},
  'shorts/missing/comments/c1':{text:{stringValue:'Comentário fictício isolado'}},
  'metadata/empty':{},
 }
 return captureFirestoreSnapshot({projectId:'demo-clipzone-tests',databaseId:'(default)',readTime:at,now:()=>Date.parse(at)+1000,limits:{requests:30,documents:10,responseBytes:2000000},read:async request=>{
  const url=new URL(request.url),name=decodeURIComponent(url.pathname.slice('/v1/'.length));if(url.origin!=='https://firestore.googleapis.com'||!name.startsWith(recoveryResource))throw Error('fixture-unexpected-target')
  if(request.method==='POST'){const parent=name.slice(recoveryResource.length,-':listCollectionIds'.length).replace(/^\//,'');return !parent?{collectionIds:['games','shorts','metadata']}:parent==='shorts/missing'?{collectionIds:['comments']}:{} }
  const collection=name.slice(recoveryResource.length+1)
  const rows=Object.entries(records).filter(([path])=>path.split('/').slice(0,-1).join('/')===collection).map(([path,fields])=>({name:recoveryResource+'/'+path,fields,createTime:created,updateTime:updated}))
  if(collection==='shorts')return {documents:[...rows,{name:recoveryResource+'/shorts/missing'}]}
  return {documents:rows}
 }})
}
