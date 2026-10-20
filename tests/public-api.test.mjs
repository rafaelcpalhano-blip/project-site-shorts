import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicApi } from '../server/http/public-api.ts'
import { createAttemptLimiter } from '../server/security/attempt-limit.ts'
// AtomicStore contract double. REST transaction contention was covered by the emulator suite.
function memoryStore() {
  const records = new Map([['games/lol', { status: 'active', officialName: 'League of Legends' }]])
  let tail = Promise.resolve()
  return { records, transact(work) {
    const operation = tail.then(async () => {
      const writes = new Map()
      const result = await work({ get: async path => records.get(path) ?? null,
        set: (path, value) => writes.set(path, value),
        create: (path, value) => { if (records.has(path)) throw new Error('exists'); writes.set(path, value) },
      })
      for (const [path, value] of writes) records.set(path, value)
      return result
    })
    tail = operation.catch(() => {})
    return operation
  } }
}
const origin = 'https://clipzone.example'
const input = { url: 'https://clips.twitch.tv/ExampleClip', gameId: 'lol' }
function request(path, cookie = '', body) {
  return new Request(origin + path, { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
test('limite de tentativas é separado, reinicia pela janela e falha fechado com dados corrompidos', async () => {
  const store = memoryStore()
  let time = new Date('2026-10-19T12:00:00Z')
  const hash = 'a'.repeat(64)
  const limit = createAttemptLimiter({ store, now: () => time, maximum: 2, windowMs: 60000 })
  const results = await Promise.allSettled([limit(hash), limit(hash), limit(hash)])
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 2)
  assert.equal(results.find(item => item.status === 'rejected').reason.code, 'abuse-limit')
  assert.equal(store.records.has('submissionLimits/' + hash), false)
  time = new Date(time.getTime() + 60000)
  await limit(hash)
  assert.equal(store.records.get('submissionAttempts/' + hash).count, 1)
  store.records.set('submissionAttempts/' + hash, { count: -1, startsAt: time })
  await assert.rejects(() => limit(hash), /Invalid attempt record/)
})
test('API conecta sessão assinada ao envio e limita tentativas rejeitadas sem gastar cota diária', async () => {
  const store = memoryStore()
  let verifications = 0
  const api = await createPublicApi({ origin, visitorSecret: 'a1'.repeat(32), store,
    now: () => new Date('2026-10-19T12:00:00Z'), maximumAttempts: 1, attemptWindowMs: 60000,
    allowSessionIssuance: async () => true,
    verify: async () => { verifications++; return { existence: 'missing', shortFormat: 'unknown', gameMatch: 'unknown', moderation: 'unavailable', flags: [] } },
  })
  assert.equal((await api(request('/api/shorts', '', input))).status, 401)
  const session = await api(request('/api/session'))
  const cookie = session.headers.get('set-cookie').split(';')[0]
  assert.equal((await api(request('/api/shorts', cookie, input))).status, 422)
  assert.equal((await api(request('/api/shorts', cookie, input))).status, 429)
  assert.equal(verifications, 1)
  assert.ok(![...store.records.keys()].some(path => path.startsWith('submissionLimits/')))
  assert.equal((await api(request('/api/unknown', cookie))).status, 404)
})
test('API publica com identidade assinada e evidência confiável, sem aceitar identidade em JSON', async () => {
  const store = memoryStore()
  const api = await createPublicApi({ origin, visitorSecret: 'b2'.repeat(32), store,
    now: () => new Date('2026-10-19T12:00:00Z'), maximumAttempts: 10, attemptWindowMs: 60000,
    allowSessionIssuance: async () => true,
    verify: async () => ({ existence: 'confirmed', shortFormat: 'confirmed', gameMatch: 'confirmed', moderation: 'clear', flags: [] }),
  })
  const cookie = (await api(request('/api/session'))).headers.get('set-cookie').split(';')[0]
  assert.equal((await api(request('/api/shorts', cookie, { ...input, visitorHash: 'a'.repeat(64) }))).status, 400)
  assert.equal((await api(request('/api/shorts', cookie, input))).status, 201)
  assert.equal([...store.records.keys()].filter(path => path.startsWith('submissionLimits/')).length, 1)
})
