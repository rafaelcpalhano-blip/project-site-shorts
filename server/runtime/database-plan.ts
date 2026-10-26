// Pure planning only: no fetch, environment lookup, store construction or apply path.
const project=(value:unknown)=>typeof value==='string'&&!/[\s\p{C}]/u.test(value)&&/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)
export function planDatabase(input:unknown,candidates:readonly string[]=[]){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid-database-plan')
 const data=input as Record<string,unknown>
 if(Object.keys(data).some(key=>!['mode','projectId','authProjectId'].includes(key)))throw Error('invalid-database-plan')
 if(data.mode==='local-audit'){
  if(data.projectId!=='demo-clipzone-tests'||data.authProjectId!==undefined)throw Error('invalid-local-target')
  return Object.freeze({mode:'local-audit',projectId:'demo-clipzone-tests',databaseId:'(default)',origin:'http://127.0.0.1:8081',remoteAllowed:false,importLocalData:false})
 }
 if(data.mode!=='remote-preview'||!project(data.projectId)||!project(data.authProjectId)||String(data.projectId).startsWith('demo-')||!candidates.includes(data.projectId as string))throw Error('unlisted-preview-target')
 return Object.freeze({mode:'remote-preview',projectId:data.projectId as string,authProjectId:data.authProjectId as string,databaseId:'(default)',origin:'https://firestore.googleapis.com',remoteAllowed:false,importLocalData:false})
}
export function planEmptyMetadata(epoch:string,at:Date){
 if(!/^[a-f0-9]{32}$/.test(epoch)||!Number.isSafeInteger(at.getTime())||at.getTime()<0)throw Error('invalid-initialization-plan')
 return {mode:'preview-only',requireEmptyBusinessCollections:true,requireOfflineWriters:true,precondition:'exists=false',importLocalData:false,documents:[
  {path:'gameNameState/v1',data:{version:1,ready:true}},
  {path:'adminQueueState/reportTitles',data:{version:1,ready:true}},
  {path:'rankingState/metrics',data:{version:1,epoch,ready:true,initializedAt:new Date(at),shorts:0,signals:0,unverifiedComments:0}},
 ]} as const
}
