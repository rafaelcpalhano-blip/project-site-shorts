import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, readdir, readFile, writeFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {capturePrivateBackup} from '../scripts/recovery/capture-private-backup.ts'
import {verifyWindowsSnapshotDirectory} from '../scripts/recovery/windows-snapshot-directory.ts'
const originalFetch = globalThis.fetch
before(() => {globalThis.fetch = () => assert.fail('Real network prohibited')})
after(() => {globalThis.fetch = originalFetch})
const at = '2026-10-26T12:00:00Z', resource = 'projects/clipzone-db02a/databases/(default)/documents'
const rejects = fn => assert.rejects(fn, /^Error: private-backup-not-verified$/)
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'clipzone-capture-fixture-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const directory = join(root, 'synthetic'), repositoryRoot = join(root, 'repository')
  await mkdir(directory); await mkdir(repositoryRoot)
  const calls = [], lifetimes = []; let oauth = 0
  const fields = [{count: {integerValue: '9223372036854775807'}}, {game: {referenceValue: resource + '/games/g1'}}]
  const options = {projectId: 'clipzone-db02a', databaseId: '(default)', directory, repositoryRoot,
    basename: 'capture-fixture', readTime: at, now: () => new Date(at),
    limits: {requests: 20, documents: 10, responseBytes: 100000}, maxFileBytes: 100000,
    timeoutMs: 30000, signal: new AbortController().signal, verifyPrivateDirectory: async () => true,
    sign: async () => new Uint8Array(256),
    oauthExchange: async (url, init) => {
      oauth++; assert.equal(url, 'https://oauth2.googleapis.com/token'); lifetimes.push(init.signal)
      return Response.json({access_token: 'fixture.token', token_type: 'Bearer', expires_in: 3600})
    },
    firestoreRead: async (input, init) => {
      const url = new URL(input); calls.push(url)
      assert.equal(url.origin, 'https://firestore.googleapis.com')
      assert.equal(init.headers.Authorization, 'Bearer fixture.token')
      assert.ok(url.pathname.startsWith('/v1/' + resource))
      if (init.method === 'POST') {
        assert.equal(JSON.parse(init.body).readTime, at)
        return Response.json(url.pathname.endsWith('/documents:listCollectionIds') ? {collectionIds: ['games']} : {})
      }
      assert.equal(init.method, 'GET'); assert.equal(url.searchParams.get('readTime'), at)
      return Response.json({documents: fields.map((value, i) => ({name: resource + '/games/g' + (i + 1),
        fields: value, createTime: '2026-10-26T11:00:00Z', updateTime: '2026-10-26T11:59:00Z'}))})
    }}
  return {options, calls, lifetimes, oauth: () => oauth}
}
test('complete injected backup preserves typed fields and closes OAuth lifetime after verified file', async t => {
  const f = await fixture(t), result = await capturePrivateBackup(f.options)
  assert.equal(result.status, 'verified'); assert.equal(result.documents, 2); assert.equal(result.requests, 4)
  assert.equal(f.oauth(), 1); assert.ok(f.lifetimes.every(signal => signal.aborted))
  const saved = JSON.parse(await readFile(result.path, 'utf8'))
  assert.equal(saved.documents[0].fields.count.integerValue, '9223372036854775807')
  assert.equal(saved.documents[1].fields.game.referenceValue, resource + '/games/g1')
  assert.equal(saved.sha256, result.sha256)
  assert.deepEqual(await readdir(f.options.directory), ['capture-fixture.snapshot.json'])
})
test('unsafe, occupied or unapproved destination and wrong project/budget refuse before OAuth', async t => {
  const f = await fixture(t)
  for (const override of [{projectId: 'other-project'}, {databaseId: 'other'}, {basename: undefined}, {directory: f.options.repositoryRoot},
    {verifyPrivateDirectory: async () => false}, {limits: {...f.options.limits, documents: 501}},
    {maxFileBytes: 8388609}, {timeoutMs: 120001}, {readTime: 'invalid'}]) {
    await rejects(() => capturePrivateBackup({...f.options, ...override}))
  }
  await writeFile(join(f.options.directory, 'capture-fixture.snapshot.json'), 'existing')
  await rejects(() => capturePrivateBackup(f.options))
  assert.equal(f.oauth(), 0); assert.equal(f.calls.length, 0)
  assert.equal(await readFile(join(f.options.directory, 'capture-fixture.snapshot.json'), 'utf8'), 'existing')
})
test('provider 429 aborts capture with no file, retry or private response disclosure', async t => {
  const f = await fixture(t); let reads = 0
  f.options.firestoreRead = async () => {reads++; return Response.json({error: 'private fixture'}, {status: 429})}
  await rejects(() => capturePrivateBackup(f.options))
  assert.equal(reads, 1); assert.equal(f.oauth(), 1)
  assert.ok(f.lifetimes.every(signal => signal.aborted))
  assert.deepEqual(await readdir(f.options.directory), [])
})
test('document/file budgets and post-capture ACL rejection never publish a completed file', async t => {
  const f = await fixture(t)
  await rejects(() => capturePrivateBackup({...f.options, limits: {...f.options.limits, documents: 1}}))
  await rejects(() => capturePrivateBackup({...f.options, maxFileBytes: 1}))
  let checks = 0
  await rejects(() => capturePrivateBackup({...f.options, verifyPrivateDirectory: async () => ++checks === 1}))
  assert.deepEqual(await readdir(f.options.directory), [])
})
test('timeout cancels injected OAuth without Firestore requests or file', async t => {
  const f = await fixture(t); let observed
  f.options.timeoutMs = 200
  f.options.oauthExchange = async (_url, init) => new Promise((_accept, reject) => {
    observed = init.signal
    init.signal.addEventListener('abort', () => reject(Error('fixture cancellation')), {once: true})
  })
  // AbortSignal.timeout alone is unrefed; keep test alive until explicit bounded completion.
  const keepAlive = setTimeout(() => {}, 1000)
  try { await rejects(() => capturePrivateBackup(f.options)) } finally {clearTimeout(keepAlive)}
  assert.equal(observed.aborted, true); assert.equal(f.calls.length, 0)
  assert.deepEqual(await readdir(f.options.directory), [])
})
test('configuration mutation during preflight cannot change pinned capture or output', async t => {
  const f = await fixture(t), original = f.options.directory
  f.options.verifyPrivateDirectory = async () => {
    f.options.projectId = 'other-project'; f.options.directory = f.options.repositoryRoot
    f.options.limits.documents = 1
    return true
  }
  const result = await capturePrivateBackup(f.options)
  assert.equal(result.documents, 2); assert.equal(result.path, join(original, 'capture-fixture.snapshot.json'))
})
test('complete injected capture uses real restricted Windows directory without real credentials or network',
  {skip: process.platform !== 'win32'}, async t => {
    const f = await fixture(t)
    const script = `
$ErrorActionPreference = 'Stop'
$path = $env:CLIPZONE_CAPTURE_FIXTURE_PATH
if ([IO.Path]::GetFileName($path) -ne 'synthetic' -or [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($path)) -notlike 'clipzone-capture-fixture-*') {throw 'refused'}
$acl = [Security.AccessControl.DirectorySecurity]::new()
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.SetOwner($sid); $acl.SetAccessRuleProtection($true, $false)
foreach ($who in @($sid, [Security.Principal.SecurityIdentifier]'S-1-5-18')) {
 $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($who, [Security.AccessControl.FileSystemRights]::FullControl, [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit', [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow))
}
[IO.Directory]::SetAccessControl($path, $acl)
`
    await promisify(execFile)(resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {windowsHide: true, timeout: 10000, maxBuffer: 4096,
        env: {...process.env, CLIPZONE_CAPTURE_FIXTURE_PATH: f.options.directory}})
    f.options.verifyPrivateDirectory = verifyWindowsSnapshotDirectory
    const result = await capturePrivateBackup(f.options)
    assert.equal(result.status, 'verified'); assert.equal(result.documents, 2)
    assert.equal(f.oauth(), 1)
    assert.ok(f.lifetimes.every(signal => signal.aborted))
  })
