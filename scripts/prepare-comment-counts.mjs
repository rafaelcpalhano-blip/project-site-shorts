// Fixed local emulator only. Preserve legacy totals as unknown until explicitly prepared.
import {createConnection} from 'node:net'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {publicCommentCount} from '../server/comments/comment-count.ts'
const mode=process.argv[2]
if(!['inspect','apply'].includes(mode)||process.argv.length!==3)throw Error('Use inspect ou apply. Somente emulador demo-clipzone:8080.')
if(mode==='apply'){
 const running=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:5174});socket.setTimeout(2000);socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(true)})})
 if(running)throw Error('Pare a API local antes de preparar contadores.')
}
const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080}),rows=[]
let after
for(;;){const page=await store.scanShorts(after);rows.push(...page);if(rows.length>300)throw Error('Limite local de 300 shorts excedido');if(page.length<30)break;after=page.at(-1).id}
const prepared=[]
for(const row of rows){
 const response=await fetch('http://127.0.0.1:8080/v1/projects/demo-clipzone/databases/(default)/documents:runAggregationQuery',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({structuredAggregationQuery:{structuredQuery:{from:[{collectionId:'comments'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'shortId'},op:'EQUAL',value:{stringValue:row.id}}},{fieldFilter:{field:{fieldPath:'moderationStatus'},op:'EQUAL',value:{stringValue:'approved'}}}]}}},aggregations:[{alias:'total',count:{}}]}}),signal:AbortSignal.timeout(10000)})
 if(!response.ok)throw Error('Contagem local indisponível')
 const result=await response.json(),value=result.find(item=>item.result?.aggregateFields?.total)?.result.aggregateFields.total.integerValue,total=Number(value)
 if(value===undefined||publicCommentCount(total)===undefined)throw Error('Total inválido')
 const current=publicCommentCount(row.data.commentCount)
 if(current!==undefined&&current!==total)throw Error('Contador divergente; diagnostique antes de alterar')
 if(current===undefined)prepared.push({id:row.id,total})
}
if(mode==='apply')for(const row of prepared)await store.transact(async tx=>{const path='shorts/'+row.id,current=await tx.get(path);if(!current||current.commentCount!==undefined)throw Error('Registro alterado durante preparação');tx.set(path,{...current,commentCount:row.total})})
console.log(JSON.stringify({examined:rows.length,missing:prepared.length,updated:mode==='apply'?prepared.length:0,applied:mode==='apply'}))
