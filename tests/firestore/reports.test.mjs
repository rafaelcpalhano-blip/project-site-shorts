import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore'
import { createRestStore } from '../../server/firestore/rest-store.ts'
import { reportShort } from '../../server/reports/report-short.ts'
const projectId='demo-clipzone-tests', shortId='a'.repeat(64), visitor='b'.repeat(64)
const input={shortId,reason:'spam'}
const options={store:createRestStore({projectId,emulatorPort:8081}),now:()=>new Date()}
let environment
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081')throw new Error('Somente emulador de testes')
 environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')}})
})
after(async()=>{await environment?.cleanup()})
test('concurrent reports deduplicate per visitor, aggregate distinct visitors and leave publication untouched',async()=>{
 await environment.clearFirestore()
 await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'shorts',shortId),{gameId:'portal',moderationStatus:'published'});await setDoc(doc(context.firestore(),'games','portal'),{status:'active'})})
 const results=await Promise.all([reportShort(input,visitor,options),reportShort(input,visitor,options),reportShort(input,'c'.repeat(64),options)])
 assert.equal(results.filter(result=>!result.duplicate).length,2)
 await environment.withSecurityRulesDisabled(async context=>{
  const db=context.firestore()
  assert.equal((await getDocs(collection(db,'reports'))).size,2)
  assert.equal((await getDoc(doc(db,'reportSummaries',shortId))).data().count,2)
  assert.equal((await getDoc(doc(db,'shorts',shortId))).data().moderationStatus,'published')
  assert.equal((await getDocs(collection(db,'submissionLimits'))).size,0)
  const report=(await getDocs(collection(db,'reports'))).docs[0]
  const publicDb=environment.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(publicDb,'reports',report.id)))
  await assertFails(getDocs(collection(publicDb,'reports')))
  await assertFails(getDoc(doc(publicDb,'reportSummaries',shortId)))
  await assertFails(setDoc(doc(publicDb,'reports','forged'),{shortId}))
  await assertFails(getDoc(doc(publicDb,'shorts',shortId)))
 })
})
test('unavailable content and forged input cannot create reports',async()=>{
 await environment.clearFirestore()
 for(const status of ['pending','removed']){
  await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'shorts',shortId),{moderationStatus:status})})
  await assert.rejects(reportShort(input,visitor,options),/short-unavailable/)
 }
 await assert.rejects(reportShort({...input,shortId:'d'.repeat(64)},visitor,options),/short-unavailable/)
 await assert.rejects(reportShort({...input,reason:'forged'},visitor,options),/invalid-input/)
 await assert.rejects(reportShort({...input,visitorHash:visitor},visitor,options),/invalid-input/)
 await environment.withSecurityRulesDisabled(async context=>{assert.equal((await getDocs(collection(context.firestore(),'reports'))).size,0)})
})
