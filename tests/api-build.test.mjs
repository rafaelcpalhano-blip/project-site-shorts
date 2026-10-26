import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'vite'
import {readFileSync} from 'node:fs'
test('API production build selects persistent screens without initializing browser Firestore or emulator',async()=>{
 const previous=process.env.VITE_DATA_MODE;process.env.VITE_DATA_MODE='api'
 let output
 try{({output}=await build({logLevel:'silent',build:{write:false,manifest:false}}))}
 finally{if(previous===undefined)delete process.env.VITE_DATA_MODE;else process.env.VITE_DATA_MODE=previous}
 const chunks=output.filter(item=>item.type==='chunk'),modules=chunks.flatMap(chunk=>chunk.moduleIds)
 assert.ok(modules.some(id=>id.endsWith('/FirestoreFeed.tsx')))
 assert.ok(!modules.some(id=>id.includes('/@firebase/firestore/')),'Persistent screens must use same-origin API, not browser Firestore')
 const source=readFileSync(new URL('../src/lib/firebase/client.ts',import.meta.url),'utf8')
 assert.doesNotMatch(source,/connectFirestoreEmulator|initializeFirestore|127\.0\.0\.1|8080/)
 assert.doesNotMatch(chunks.map(c=>c.code).join('\n'),/-----BEGIN PRIVATE KEY-----/)
})
