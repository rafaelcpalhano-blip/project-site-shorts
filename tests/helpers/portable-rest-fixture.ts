import type {RecordData} from '../../server/firestore/atomic-store.ts'
/** In-memory REST protocol fixture. Never falls through to network. */
export function restFixture(initial:Map<string,RecordData>,now:()=>Date){
 const docs=structuredClone(initial),root='projects/clipzone-db02a/databases/(default)/documents/',snapshots=new Map<string,Map<string,RecordData>>()
 let calls=0,clock=0,oauth=0;const transactions=new Map<string,Map<string,string>>()
 const encode=(v:unknown):unknown=>v instanceof Date?{timestampValue:v.toISOString()}:v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v as RecordData).map(([k,v])=>[k,encode(v)]))}}
 const decode=(v:RecordData):unknown=>'timestampValue'in v?new Date(String(v.timestampValue)):'nullValue'in v?null:'stringValue'in v?v.stringValue:'booleanValue'in v?v.booleanValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'arrayValue'in v?((v.arrayValue as {values?:RecordData[]}).values??[]).map(decode):Object.fromEntries(Object.entries((v.mapValue as {fields:Record<string,RecordData>}).fields).map(([k,v])=>[k,decode(v)]))
 const fields=(data:RecordData)=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))
 const fingerprint=(value:RecordData|undefined)=>JSON.stringify(value??null)
 const fetcher:typeof fetch=async(input,init)=>{
  calls++;const url=String(input)
  if(url==='https://oauth2.googleapis.com/token'){oauth++;return Response.json({access_token:'fixture-only',token_type:'Bearer',expires_in:3600})}
  if(!url.startsWith('https://firestore.googleapis.com/v1/'+root.slice(0,-1)+':'))throw Error('fixture-unexpected-host')
  const operation=url.split(':').at(-1),body=JSON.parse(String(init?.body))
  if(operation==='beginTransaction'){const id=String(++clock);transactions.set(id,new Map());return Response.json({transaction:id})}
  if(operation==='rollback'){transactions.delete(body.transaction);return Response.json({})}
  if(operation==='batchGet'){
   const started=body.newTransaction?String(++clock):undefined
   if(started){transactions.set(started,new Map());body.transaction=started}
   const source=body.readTime?snapshots.get(body.readTime)!:docs
   const rows=body.documents.map((name:string)=>{const path=name.slice(root.length),data=source.get(path);if(body.transaction)transactions.get(body.transaction)!.set(path,fingerprint(docs.get(path)));return data?{found:{name,fields:fields(data)}}:{missing:name}})
   return Response.json([...(started?[{transaction:started}]:[]),...rows])
  }
  if(operation==='commit'){
   const reads=transactions.get(body.transaction)
   if(!reads||[...reads].some(([p,v])=>fingerprint(docs.get(p))!==v))return Response.json({error:{status:'ABORTED'}},{status:409})
   const next=structuredClone(docs)
   for(const write of body.writes){
    if(write.delete){next.delete(write.delete.slice(root.length));continue}
    const path=write.update.name.slice(root.length)
    if(write.currentDocument?.exists===false&&next.has(path))return Response.json({error:{status:'ALREADY_EXISTS'}},{status:409})
    next.set(path,Object.fromEntries(Object.entries(write.update.fields as Record<string,RecordData>).map(([k,v])=>[k,decode(v)])))
   }
   docs.clear();for(const [p,v]of next)docs.set(p,v);transactions.delete(body.transaction);return Response.json({})
  }
  if(operation==='runQuery'){
   const query=body.structuredQuery,collection=query.from[0].collectionId
   if(!['shorts','games','comments','moderationLogs','rankingRuns','rankingItems','networkAbuse'].includes(collection))throw Error('fixture-unexpected-query')
   const point=body.readTime??now().toISOString();if(!snapshots.has(point))snapshots.set(point,structuredClone(docs))
   let rows=[...(body.readTime?snapshots.get(point)!:docs)].filter(([p])=>p.startsWith(collection+'/')).sort(([a],[b])=>a<b?-1:a>b?1:0)
   const filters:RecordData[]=[]
   const collect=(filter:RecordData|undefined)=>{if(!filter)return;if(filter.fieldFilter)filters.push(filter.fieldFilter as RecordData);for(const child of ((filter.compositeFilter as {filters?:RecordData[]})?.filters??[]))collect(child)}
   collect(query.where)
   for(const filter of filters){const field=(filter.field as {fieldPath:string}).fieldPath,value=decode(filter.value as RecordData);rows=rows.filter(([,d])=>filter.op==='EQUAL'?d[field]===value:filter.op==='IN'?(value as unknown[]).includes(d[field]):filter.op==='LESS_THAN_OR_EQUAL'?(d[field] as Date)<=(value as Date):false)}
   rows.sort(([a,ad],[b,bd])=>{for(const order of query.orderBy??[]){const field=order.field.fieldPath,av=field==='__name__'?a:ad[field],bv=field==='__name__'?b:bd[field],left=av instanceof Date?av.getTime():av as string,right=bv instanceof Date?bv.getTime():bv as string;if(left!==right)return (left<right?-1:1)*(order.direction==='DESCENDING'?-1:1)}return 0})
   if(query.startAt){const last=query.startAt.values[0].referenceValue.slice(root.length);rows=rows.filter(([p])=>p>last)}
   if(collection==='networkAbuse')rows=rows.filter(([,d])=>d.expiresAt instanceof Date&&d.expiresAt<=now())
   return Response.json([{readTime:point},...rows.slice(0,query.limit).map(([p,d])=>({document:{name:root+p,fields:fields(d)},readTime:point}))])
  }
  throw Error('fixture-unexpected-operation')
 }
 return {docs,fetcher,calls:()=>calls,oauth:()=>oauth}
}
