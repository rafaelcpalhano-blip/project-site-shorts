import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, deleteDoc, updateDoc, getDoc, getDocs, collection, query, where, limit, Timestamp } from 'firebase/firestore'
import { createPublicRepository } from '../../src/lib/firebase/public-repository.ts'
let environment
let database
before(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST
  if (host !== '127.0.0.1:8081') throw new Error('Testes exigem emulador em 127.0.0.1:8081')
  environment = await initializeTestEnvironment({
    projectId: 'demo-clipzone-tests',
    firestore: { host: '127.0.0.1', port: 8081, rules: await readFile(new URL('../../firestore/firestore.rules', import.meta.url), 'utf8') },
  })
  await environment.clearFirestore()
  database = environment.unauthenticatedContext().firestore()
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    const date = Timestamp.fromMillis(100000)
    for (const [id, status] of [['game-a', 'active'], ['game-b', 'active'], ['hidden', 'inactive']]) {
      await setDoc(doc(db, 'games', id), { officialName: id, status, createdAt: date })
    }
    for (let index = 0; index < 34; index++) await setDoc(doc(db, 'shorts', 's' + String(index).padStart(2, '0')), {
      title: 'Jogada ' + index, gameId: index % 2 ? 'game-a' : 'game-b', channelName: '',
      platform: 'Twitch', platformVideoId: 'Clip' + index, normalizedUrl: 'https://clips.twitch.tv/Clip' + index,
      createdAt: date, moderationStatus: 'published',
    })
    await setDoc(doc(db, 'shorts', 'hidden'), { moderationStatus: 'pending', createdAt: date })
    for (const status of ['pending', 'approved', 'rejected', 'removed']) {
      await setDoc(doc(db, 'comments', status), { shortId: 's00', content: status, createdAt: date, moderationStatus: status })
    }
    await setDoc(doc(db, 'comments', 'hidden-parent'), {
      shortId: 'hidden', content: 'Não público', createdAt: date, moderationStatus: 'approved',
    })
    for (const name of ['gameRequests', 'submissionLimits', 'moderationLogs', 'adminConfig', 'videoIdentities', 'submissionOwners']) {
      await setDoc(doc(db, name, 'private'), { status: 'pending' })
    }
  })
})
after(async () => { await environment?.cleanup() })
test('feed pagina 15/15/4 sem repetir itens com datas iguais', async () => {
  const repository = createPublicRepository(database)
  const first = await repository.listShorts()
  const second = await repository.listShorts(undefined, first.next)
  const third = await repository.listShorts(undefined, second.next)
  assert.deepEqual([first.items.length, second.items.length, third.items.length], [15, 15, 4])
  const ids = [...first.items, ...second.items, ...third.items].map(item => item.id)
  assert.equal(new Set(ids).size, 34)
  assert.equal(ids[0], 's33')
  assert.equal(ids.at(-1), 's00')
  assert.equal(third.next, null)
  assert.deepEqual((await repository.listShorts()).items, first.items)
})
test('filtro usa consulta por um jogo sem carregar a coleção inteira', async () => {
  const repository = createPublicRepository(database)
  const first = await repository.listShorts('game-a')
  const second = await repository.listShorts('game-a', first.next)
  assert.equal(first.items.length, 15); assert.equal(second.items.length, 2)
  assert.ok([...first.items, ...second.items].every(item => item.gameId === 'game-a'))
})
test('catálogo público exclui jogos inativos', async () => {
  const repository = createPublicRepository(database)
  assert.equal((await repository.listGames()).items.length, 2)
  assert.equal((await repository.getGame('game-a')).name, 'game-a')
  await assertFails(getDoc(doc(database, 'games', 'hidden')))
})
test('leituras de shorts pendentes e consultas sem restrições são negadas', async () => {
  await assertFails(getDoc(doc(database, 'shorts', 'hidden')))
  await assertFails(getDocs(query(collection(database, 'shorts'), limit(16))))
  await assertFails(getDocs(query(collection(database, 'shorts'), where('moderationStatus', '==', 'published'))))
  await assertFails(getDocs(query(collection(database, 'shorts'), where('moderationStatus', '==', 'published'), limit(17))))
  await assertSucceeds(getDoc(doc(database, 'shorts', 's00')))
})
test('somente comentários aprovados de shorts públicos são lidos', async () => {
  const repository = createPublicRepository(database)
  const page = await repository.listComments('s00')
  assert.deepEqual(page.items.map(item => item.id), ['approved'])
  for (const id of ['pending', 'rejected', 'removed', 'hidden-parent']) await assertFails(getDoc(doc(database, 'comments', id)))
  await assertFails(repository.listComments('hidden'))
})
test('coleções privadas não podem ser lidas nem listadas', async () => {
  for (const name of ['gameRequests', 'submissionLimits', 'moderationLogs', 'adminConfig', 'videoIdentities', 'submissionOwners']) {
    await assertFails(getDoc(doc(database, name, 'private')))
    await assertFails(getDocs(query(collection(database, name), limit(1))))
  }
})
test('visitantes e clientes com claim admin não podem gravar, alterar ou excluir', async () => {
  for (const db of [database, environment.authenticatedContext('owner', { admin: true }).firestore()]) {
    await assertFails(setDoc(doc(db, 'shorts', 'new'), { moderationStatus: 'published' }))
    await assertFails(updateDoc(doc(db, 'shorts', 's00'), { title: 'Alterado' }))
    await assertFails(deleteDoc(doc(db, 'shorts', 's00')))
    await assertFails(setDoc(doc(db, 'comments', 'new'), { moderationStatus: 'approved' }))
    await assertFails(setDoc(doc(db, 'games', 'new'), { status: 'active' }))
    await assertFails(setDoc(doc(db, 'gameRequests', 'new'), { status: 'pending' }))
  }
})
test('feed vazio retorna página vazia sem cursor', async () => {
  const result = await createPublicRepository(database).listShorts('does-not-exist')
  assert.deepEqual(result, { items: [], next: null })
})

