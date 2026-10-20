import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubmissionClient } from '../src/features/submissions/services/submission-api.ts'
const input = { url: 'https://clips.twitch.tv/Example', gameId: 'lol', channelName: '' }
test('cliente cria sessão e envia apenas campos públicos, distinguindo publicado e pendente', async () => {
  for (const status of ['published', 'pending']) {
    const calls = []
    const send = createSubmissionClient(async (path, options) => {
      calls.push({ path, options })
      return path === '/api/session' ? new Response(null, { status: 204 }) : Response.json({ id: 'a'.repeat(64), status, remaining: 4 }, { status: status === 'published' ? 201 : 202 })
    })
    assert.equal((await send(input)).status, status)
    assert.deepEqual(calls.map(call => call.path), ['/api/session', '/api/shorts'])
    assert.deepEqual(JSON.parse(calls[1].options.body), input)
    assert.equal(calls[1].options.credentials, 'same-origin')
    assert.equal(calls[1].options.redirect, 'error')
  }
})
test('cliente interrompe sem sessão, ignora mensagens internas e não repete envio após falha', async () => {
  let calls = 0
  const unavailable = createSubmissionClient(async () => { calls++; return new Response('private server details', { status: 503 }) })
  await assert.rejects(() => unavailable(input), /Publicação indisponível/)
  assert.equal(calls, 1)
  calls = 0
  const networkFailure = createSubmissionClient(async () => {
    calls++
    if (calls === 1) return new Response(null, { status: 204 })
    throw new TypeError('connection lost')
  })
  await assert.rejects(() => networkFailure(input))
  assert.equal(calls, 2)
})
test('cliente rejeita sucesso inconsistente e valida entrada antes da rede', async () => {
  const malformed = createSubmissionClient(async path => path === '/api/session' ? new Response(null, { status: 204 }) : Response.json({ id: 'a'.repeat(64), status: 'published', remaining: 4 }, { status: 202 }))
  await assert.rejects(() => malformed(input), /Resposta de envio inesperada/)
  let calls = 0
  const send = createSubmissionClient(async () => { calls++; return new Response() })
  await assert.rejects(() => send({ ...input, visitorHash: 'forged' }))
  assert.equal(calls, 0)
})
