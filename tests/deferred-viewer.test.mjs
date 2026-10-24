import test from 'node:test'
import assert from 'node:assert/strict'
import {createDeferredModule} from '../src/components/ui/deferred-module.ts'
import {build} from 'vite'

test('importação só inicia quando solicitada e compartilha carregamento e resultado',async()=>{
 let calls=0,resolve
 const value={component:'viewer'},load=createDeferredModule(()=>{calls++;return new Promise(done=>{resolve=done})})
 assert.equal(calls,0)
 const first=load(),second=load()
 assert.equal(first,second);await Promise.resolve();assert.equal(calls,1)
 resolve(value);assert.equal(await first,value);assert.equal(await load(),value);assert.equal(calls,1)
})
test('falha concorrente não bloqueia nova tentativa e exceção síncrona também recupera',async()=>{
 let calls=0
 const load=createDeferredModule(()=>{if(++calls===1)throw Error('offline');return Promise.resolve('ready')})
 const first=load(),second=load();assert.equal(first,second)
 await assert.rejects(first,/offline/);assert.equal(await load(),'ready');assert.equal(calls,2)
})
test('home da build não baixa visualizadores, players ou administração antes da interação',async()=>{
 const previous=process.env.VITE_DATA_MODE;process.env.VITE_DATA_MODE='firestore-emulator'
 let output
 try{({output}=await build({logLevel:'silent',build:{write:false,manifest:false}}))}
 finally{if(previous===undefined)delete process.env.VITE_DATA_MODE;else process.env.VITE_DATA_MODE=previous}
 const chunks=output.filter(item=>item.type==='chunk'),byFile=new Map(chunks.map(item=>[item.fileName,item]))
 const feed=chunks.find(item=>item.moduleIds.some(id=>id.endsWith('/FirestoreFeed.tsx'))),entry=chunks.find(item=>item.isEntry)
 assert.ok(feed);assert.ok(entry)
 const initial=new Set()
 function visit(chunk){if(initial.has(chunk))return;initial.add(chunk);chunk.imports.forEach(file=>{if(byFile.has(file))visit(byFile.get(file))})}
 visit(entry);visit(feed)
 const modules=[...initial].flatMap(chunk=>chunk.moduleIds)
 assert.ok(modules.some(id=>id.endsWith('/public-repository.ts')),'catálogo continua no grafo inicial')
 for(const name of ['ShortSequenceDialog.tsx','FirestoreShortDialog.tsx','ShortDialog.tsx','OfficialPlayer.tsx','AdminPage.tsx','PersistentSubmissionDialog.tsx']){
  assert.ok(!modules.some(id=>id.endsWith('/'+name)),name+' deve aguardar interação')
  assert.ok(chunks.some(chunk=>chunk.moduleIds.some(id=>id.endsWith('/'+name))),name+' deve permanecer disponível')
 }
 const bytes=[...initial].reduce((sum,chunk)=>sum+Buffer.byteLength(chunk.code),0)
 assert.ok(bytes<870000,'bytes iniciais devem manter redução frente aos 890454B da etapa C')
 console.log('JS inicial de entrada + feed:',bytes,'bytes em',initial.size,'chunks')
})
