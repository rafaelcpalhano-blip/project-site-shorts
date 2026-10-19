import test from 'node:test'
import assert from 'node:assert/strict'
import { decidePublication } from '../server/submissions/decision.ts'
const clean = { existence:'confirmed', shortFormat:'confirmed', gameMatch:'confirmed', moderation:'clear', flags:[] }
test('publicação válida é automática, inclusive combate fictício de jogo', () => {
  assert.equal(decidePublication(clean).status, 'published')
  assert.equal(decidePublication({ ...clean, flags:['gameplay-violence'] }).status, 'published')
})
test('ameaças, violência real, nomes inconsistentes e resultados incompletos vão à revisão', () => {
  for (const flag of ['real-violence','threat','hate','name-inconsistency']) assert.equal(decidePublication({ ...clean, flags:[flag] }).status, 'pending')
  for (const patch of [{ moderation:'unavailable' }, { gameMatch:'unknown' }, { gameMatch:'mismatch' }, { shortFormat:'unknown' }, { existence:'unknown' }]) {
    assert.equal(decidePublication({ ...clean, ...patch }).status, 'pending')
  }
})
test('vídeo inexistente e formato inválido são rejeitados', () => {
  assert.equal(decidePublication({ ...clean, existence:'missing' }).status, 'rejected')
  assert.equal(decidePublication({ ...clean, shortFormat:'invalid' }).status, 'rejected')
})

