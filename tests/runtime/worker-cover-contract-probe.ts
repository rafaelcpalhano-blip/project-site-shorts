// Local compatibility fixture only; no provider requests or production entry.
import {serveStaticGameCover} from '../../server/runtime/static-game-cover.ts'
import {editManualGame} from '../../server/games/edit-manual-game.ts'
import {createManualGame} from '../../server/games/manual-game.ts'
import {nameStatePath} from '../../server/games/name-keys.ts'
import {manualGameCoverUrl} from '../../src/lib/validation/manual-game-details.ts'
import type {AtomicStore,RecordData} from '../../server/firestore/atomic-store.ts'
const ensure=(condition:unknown)=>{if(!condition)throw Error('cover-contract-proof-failed')}
async function proof(){
 const passed:string[]=[],check=(condition:unknown,label:string)=>{ensure(condition);passed.push(label)}
 check(manualGameCoverUrl('/images/games/fixture.png')==='/images/games/fixture.png','static cover path preserved')
 const igdb='https://images.igdb.com/igdb/image/upload/t_thumb/fixture.jpg'
 check(manualGameCoverUrl(igdb)==='https://images.igdb.com/igdb/image/upload/t_cover_big_2x/fixture.jpg','IGDB host and path normalized')
 check(manualGameCoverUrl('https://cdn.unapproved.org/fixture.png')===undefined,'unapproved external source rejected before inspection')
 check(['/images/games/../private.png','http://cdn.unapproved.org/a.png','data:image/png;base64,x'].every(value=>manualGameCoverUrl(value)===undefined),'traversal and unsafe schemes rejected')
 const docs=new Map<string,RecordData>([[nameStatePath,{version:1,ready:true}]])
 const store:AtomicStore={get:async path=>structuredClone(docs.get(path)??null),transact:async work=>{
  const writes=new Map<string,RecordData>()
  const result=await work({get:async path=>structuredClone(docs.get(path)??null),set:(path,data)=>{writes.set(path,structuredClone(data))},create:(path,data)=>{ensure(!docs.has(path));writes.set(path,structuredClone(data))}})
  for(const [path,data]of writes)docs.set(path,data)
  return result
 }}
 const now=()=>new Date('2026-10-25T12:00:00Z'),created=await createManualGame({name:'Fixture cover game'},'a'.repeat(64),{store,now}),id=created.game.id
 docs.set('shorts/fixture',{gameId:id,moderationStatus:'published'})
 let inspections=0
 const save=(imageUrl:string,revision:number)=>editManualGame({id,revision,confirmed:true,reason:'Local compatibility verification',details:{name:'Fixture cover game',description:'',imageUrl,releaseDate:null,genres:[],gameModes:[],platforms:[],aliases:[]}},'fixture-owner',{store,now,inspectCover:async()=>{inspections++;throw Error('outbound-inspection-forbidden')}})
 await save('/images/games/fixture.png',0)
 check(inspections===0&&docs.get('games/'+id)?.imageUrl==='/images/games/fixture.png','real static edit bypasses remote inspector')
 await save(igdb,1)
 check(inspections===0&&docs.get('games/'+id)?.imageUrl==='https://images.igdb.com/igdb/image/upload/t_cover_big_2x/fixture.jpg','real IGDB edit uses existing trusted-source branch')
 check(docs.get('shorts/fixture')?.gameId===id&&docs.get('games/'+id)?.reviewVersion===2&&[...docs.values()].filter(row=>row.action==='edit-metadata').length===2,'edits preserve game link and versioned audit')
 return {passed,deployReady:false,externalTransport:'other hosts not authorized; no arbitrary URL fetched',limits:['synthetic documents and image only','not a live IGDB availability test','only safe local paths and exact IGDB URL format authorized']}
}
export default {async fetch(request:Request,env:{ASSETS:{fetch:(request:Request)=>Promise<Response>}}){
 if(new URL(request.url).pathname==='/__cover-contract-proof'){
  try{return Response.json(await proof())}catch{return Response.json({error:'cover-proof-failed'},{status:500})}
 }
 return new URL(request.url).pathname.startsWith('/images/games/')?serveStaticGameCover(request,req=>env.ASSETS.fetch(req)):env.ASSETS.fetch(request)
}}
