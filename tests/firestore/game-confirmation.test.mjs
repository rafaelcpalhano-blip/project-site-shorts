import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore'
import { createRestStore } from '../../server/firestore/rest-store.ts'
import { confirmGame } from '../../server/games/confirm-game.ts'
const projectId = 'demo-clipzone-tests'
let environment
const game = { externalId: '100', officialName: 'Official game', description: '', aliases: [], genres: [], gameModes: [], platforms: [], releaseDate: null, imageUrl: null, sourceUrl: null }
const dependencies = { store: createRestStore({ projectId, emulatorPort: 8081 }), get: async () => game, now: () => new Date() }
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081') throw new Error('Somente emulador de testes local')
  environment = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8081,
    rules: await readFile(new URL('../../firestore/firestore.rules', import.meta.url), 'utf8') } })
})
after(async () => { await environment?.cleanup() })
test('confirmações simultâneas no Firestore criam exatamente um jogo', async () => {
  await environment.clearFirestore()
  const results = await Promise.all(Array.from({ length: 3 }, () => confirmGame({ externalId: '100' }, dependencies)))
  assert.equal(results.filter(result => result.created).length, 1)
  assert.ok(results.every(result => result.id === 'igdb-100'))
  await environment.withSecurityRulesDisabled(async context => {
    const games = await getDocs(collection(context.firestore(), 'games'))
    assert.equal(games.size, 1)
    assert.equal(games.docs[0].data().source, 'IGDB')
  })
  const visitor = environment.unauthenticatedContext().firestore()
  assert.equal((await getDoc(doc(visitor, 'games/igdb-100'))).data().officialName, 'Official game')
  await assertFails(setDoc(doc(visitor, 'games/igdb-100'), { officialName: 'Forged', status: 'active' }))
})
test('jogo desabilitado não é reativado nem fica visível ao visitante', async () => {
  await environment.clearFirestore()
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'games/igdb-100'), { externalId: '100', source: 'IGDB', officialName: 'Official game', status: 'disabled' })
  })
  await assert.rejects(() => confirmGame({ externalId: '100' }, dependencies), { code: 'game-unavailable' })
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'games/igdb-100')))
  await environment.withSecurityRulesDisabled(async context => {
    assert.equal((await getDoc(doc(context.firestore(), 'games/igdb-100'))).data().status, 'disabled')
  })
})
test('ausência ou indisponibilidade do IGDB não grava jogo no Firestore', async () => {
  await environment.clearFirestore()
  await assert.rejects(() => confirmGame({ externalId: '100' }, { ...dependencies, get: async () => null }), { code: 'game-not-found' })
  await assert.rejects(() => confirmGame({ externalId: '100' }, { ...dependencies, get: async () => { throw new Error('provider unavailable') } }))
  await environment.withSecurityRulesDisabled(async context => {
    assert.equal((await getDocs(collection(context.firestore(), 'games'))).size, 0)
  })
})
