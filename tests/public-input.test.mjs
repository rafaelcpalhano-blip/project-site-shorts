import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSubmissionInput, validateCommentInput, validateGameRequestInput } from '../src/lib/validation/public-input.ts'
import { saoPauloDayKey } from '../src/lib/validation/day-key.ts'
const valid = { url: 'https://www.youtube.com/shorts/abcdefghijk?si=tracking', gameId: 'lol', channelName: ' Canal ' }
test('envio normalizado exige um único identificador de jogo', () => {
  const result = validateSubmissionInput(valid)
  assert.equal(result.channelName, 'Canal')
  assert.equal(result.identity, 'YouTube:abcdefghijk')
  for (const gameId of [undefined, '', ['lol'], ['lol', 'valorant'], { id: 'lol' }, '../lol']) {
    assert.throws(() => validateSubmissionInput({ ...valid, gameId }))
  }
})
test('não aceita campos administrativos ou entradas inválidas', () => {
  for (const data of [null, [], 'texto', { ...valid, moderationStatus: 'published' }, { ...valid, createdAt: 1 }]) {
    assert.throws(() => validateSubmissionInput(data))
  }
  assert.throws(() => validateSubmissionInput({ ...valid, channelName: 'x'.repeat(81) }))
  assert.throws(() => validateSubmissionInput({ ...valid, channelName: 'canal\u0000oculto' }))
  assert.throws(() => validateSubmissionInput({ ...valid, url: 'x'.repeat(2049) }))
})
test('comentários preservam texto e limitam tamanho, sem liberar moderação', () => {
  assert.equal(validateCommentInput({ shortId: 'short-1', content: ' Bem\n jogado! ' }).content, 'Bem\n jogado!')
  assert.throws(() => validateCommentInput({ shortId: 'short-1', content: ' ' }))
  assert.throws(() => validateCommentInput({ shortId: 'short-1', content: 'x'.repeat(501) }))
  assert.throws(() => validateCommentInput({ shortId: 'short-1', content: 'Oi', moderationStatus: 'approved' }))
})
test('normalização de jogo preserva nome exibido e distingue sequências', () => {
  assert.deepEqual(validateGameRequestInput({ name: '  POKÉMON   X ' }), { name: 'POKÉMON   X', normalizedName: 'pokemon x' })
  assert.notEqual(validateGameRequestInput({ name: 'Portal' }).normalizedName, validateGameRequestInput({ name: 'Portal 2' }).normalizedName)
})
test('dia civil muda à meia-noite de São Paulo, não à meia-noite UTC', () => {
  assert.equal(saoPauloDayKey(new Date('2026-10-19T02:59:59.999Z')), '2026-10-18')
  assert.equal(saoPauloDayKey(new Date('2026-10-19T03:00:00.000Z')), '2026-10-19')
  assert.equal(saoPauloDayKey(new Date('2027-01-01T02:59:59Z')), '2026-12-31')
  assert.throws(() => saoPauloDayKey(new Date('invalid')))
})

