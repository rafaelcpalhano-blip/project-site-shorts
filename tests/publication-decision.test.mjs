import test from 'node:test'
import assert from 'node:assert/strict'
import { decidePublication } from '../server/submissions/decision.ts'
const clean = { existence:'confirmed', shortFormat:'confirmed', gameMatch:'confirmed', moderation:'clear', flags:[] }
test('valid publication is automatic with visitor game declaration and normal gameplay violence', () => {
  for (const patch of [{}, {moderation:'unavailable'}, {flags:['gameplay-violence']}, {gameMatch:'unknown'}, {gameMatch:'mismatch'}]) {
    assert.equal(decidePublication({...clean,...patch}).status,'published')
  }
})
test('real violence, threats, hate and name inconsistencies retain preventive review', () => {
  for (const flag of ['real-violence','threat','hate','name-inconsistency']) {
    assert.equal(decidePublication({...clean,flags:[flag]}).status,'pending')
  }
  assert.equal(decidePublication({...clean,moderation:'flagged'}).status,'pending')
})
test('essential uncertainty requests retry even for flagged videos instead of reserving a pending item', () => {
  for (const patch of [{existence:'unknown'}, {shortFormat:'unknown'}, {embedding:'unknown'}]) {
    for (const flags of [[], ['threat']]) {
      assert.deepEqual(decidePublication({...clean,...patch,flags}),{status:'retry',reason:'verification-incomplete'})
    }
  }
})
test('missing video, invalid duration and disabled embedding are rejected', () => {
  for (const patch of [{existence:'missing'}, {shortFormat:'invalid'}, {embedding:'blocked'}]) {
    assert.equal(decidePublication({...clean,...patch}).status,'rejected')
  }
})
