import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { localApiBridge } from '../scripts/local-api-bridge.mjs'

async function run({ host = '127.0.0.1:5174', url = '/api/session', method = 'POST', body = '', address='127.0.0.1' } = {}, api = async () => new Response(null, { status: 204 })) {
  const incoming = Readable.from([Buffer.from(body)])
  Object.assign(incoming, { headers: { host }, rawHeaders: ['Host', host, 'CF-Connecting-IP', '198.51.100.99', 'X-Forwarded-For', '198.51.100.99'], socket:{remoteAddress:address}, url, method })
  const result = { next: false }
  const outgoing = {
    writeHead(status, headers) { result.status = status; result.headers = headers; return this },
    end(body) { result.body = body?.toString() },
  }
  await localApiBridge(api, 'https://127.0.0.1:5174')(incoming, outgoing, () => { result.next = true })
  return result
}
test('rejects foreign Host and absolute/network-path URLs before routing', async () => {
  for (const options of [{ host: 'attacker.test' }, { url: '//attacker.test/api/session' }, { url: 'https://attacker.test/' }]) {
    assert.equal((await run(options, () => assert.fail('must not call API'))).status, 403)
  }
})
test('passes body and secure cookie without rewriting production identity', async () => {
  const result = await run({ body: '{"externalId":"1"}' }, async request => {
    assert.equal(request.url, 'https://127.0.0.1:5174/api/session')
    assert.deepEqual(await request.json(), { externalId: '1' })
    return new Response(null, { status: 204, headers: { 'Set-Cookie': '__Host-test=x; Secure; HttpOnly; Path=/' } })
  })
  assert.equal(result.status, 204)
  assert.match(result.headers['set-cookie'], /Secure; HttpOnly/)
})
test('delegates frontend paths and hides internal API failures', async () => {
  assert.equal((await run({ url: '/' })).next, true)
  const result = await run({}, () => { throw new Error('private-token') })
  assert.equal(result.status, 503)
  assert.equal(result.body, '{"error":"unavailable"}')
})


test('IP confiável vem do socket; cabeçalhos forjados não viram contexto de rede',async()=>{
 const result=await run({address:'::ffff:203.0.113.10'},async(request,trusted)=>{
  assert.equal(request.headers.get('cf-connecting-ip'),'198.51.100.99')
  assert.deepEqual(trusted,{clientAddress:'::ffff:203.0.113.10'})
  return new Response(null,{status:204})
 });assert.equal(result.status,204)
})
