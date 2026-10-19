import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore'
import { createRestStore } from '../../server/firestore/rest-store.ts'
import { submitShort } from '../../server/submissions/submit-short.ts'
let environment
const visitor = 'a'.repeat(64)
const clean = { existence:'confirmed', shortFormat:'confirmed', gameMatch:'confirmed', moderation:'clear', flags:[], title:'Jogada verificada' }
const input = id => ({ url:'https://clips.twitch.tv/' + id, gameId:'lol', channelName:'Canal' })
const store = createRestStore({ projectId:'demo-clipzone-tests', emulatorPort:8081 })
const dependencies = { store, checkAbuse:async () => {}, verify:async () => clean, now:() => new Date('2026-10-19T12:00:00Z') }
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081') throw new Error('Somente emulador local')
  environment = await initializeTestEnvironment({
    projectId:'demo-clipzone-tests', firestore:{host:'127.0.0.1',port:8081,rules:await readFile(new URL('../../firestore/firestore.rules',import.meta.url),'utf8')},
  })
})
after(async () => { await environment?.cleanup() })
async function scenario(work) {
  await environment.clearFirestore()
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db,'games','lol'), { officialName:'League of Legends',status:'active' })
    await work(db)
  })
}
test('transação REST publica automaticamente e duas requisições do mesmo vídeo criam um único registro', async () => scenario(async db => {
  const outcomes = await Promise.allSettled([submitShort(input('SameClip'),visitor,dependencies), submitShort(input('SameClip'),visitor,dependencies)])
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length,1)
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.code,'duplicate-video')
  assert.equal((await getDocs(collection(db,'shorts'))).size,1)
  assert.equal((await getDocs(collection(db,'submissionLimits'))).docs[0].data().count,1)
}))
test('publicações concorrentes não ultrapassam cinco por dia', async () => scenario(async db => {
  const outcomes = await Promise.allSettled(Array.from({length:7},(_,index) => submitShort(input('Concurrent' + index),visitor,dependencies)))
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length,5, JSON.stringify(outcomes.map(result => result.status === 'rejected' ? { code: result.reason.code, message: result.reason.message } : 'published')))
  for (const result of outcomes.filter(result => result.status === 'rejected')) assert.equal(result.reason.code,'daily-limit')
  assert.equal((await getDocs(collection(db,'shorts'))).size,5)
}))
test('pendentes e rejeitados não gastam cota; pendentes não são publicados', async () => scenario(async db => {
  const result = await submitShort(input('Pending'),visitor,{...dependencies,verify:async()=>({...clean,moderation:'unavailable'})})
  assert.equal(result.status,'pending')
  assert.equal((await getDocs(collection(db,'submissionLimits'))).size,0)
  await assert.rejects(submitShort(input('Missing'),visitor,{...dependencies,verify:async()=>({...clean,existence:'missing'})}),{code:'video-not-found'})
  assert.equal((await getDocs(collection(db,'shorts'))).size,1)
}))
test('remoção preserva reserva e impede republicação sem revelar link privado', async () => scenario(async db => {
  const result = await submitShort(input('Removed'),visitor,dependencies)
  await updateDoc(doc(db,'shorts',result.id),{moderationStatus:'removed'})
  await assert.rejects(submitShort(input('Removed'),visitor,dependencies),error=>error.code==='duplicate-video' && error.publicShortId===undefined)
  assert.equal((await getDoc(doc(db,'videoIdentities',result.id))).exists(),true)
}))
test('data confiável muda cota à meia-noite e jogo inválido não gera documentos', async () => scenario(async db => {
  await submitShort(input('Before'),visitor,{...dependencies,now:()=>new Date('2026-10-19T02:59:59Z')})
  await submitShort(input('After'),visitor,{...dependencies,now:()=>new Date('2026-10-19T03:00:00Z')})
  assert.equal((await getDocs(collection(db,'submissionLimits'))).size,2)
  await assert.rejects(submitShort({...input('NoGame'),gameId:'missing'},visitor,dependencies),{code:'invalid-game'})
  assert.equal((await getDocs(collection(db,'shorts'))).size,2)
}))
test('checagem de abuso obrigatória interrompe antes da gravação', async () => scenario(async db => {
  await assert.rejects(submitShort(input('Abuse'),visitor,{...dependencies,checkAbuse:async()=>{throw new Error('rate-limited')}}),/rate-limited/)
  assert.equal((await getDocs(collection(db,'shorts'))).size,0)
}))

