import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync, verify} from 'node:crypto'
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, link} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {loadSnapshotSigner} from '../scripts/recovery/load-snapshot-signer.ts'
import {verifyWindowsSnapshotCredential} from '../scripts/recovery/windows-snapshot-credential.ts'
import {backupFromCredential} from '../scripts/recovery/backup-from-credential.ts'
const originalFetch = globalThis.fetch
let keys
before(() => {
  globalThis.fetch = () => assert.fail('real network forbidden')
  keys = generateKeyPairSync('rsa', {modulusLength: 2048,
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'}, publicKeyEncoding: {type: 'spki', format: 'pem'}})
})
after(() => {globalThis.fetch = originalFetch; keys = undefined})
const fail = fn => assert.rejects(fn, /^Error: snapshot-credential-unavailable$/)
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'clipzone-credential-fixture-'))
  t.after(async () => {
    assert.ok(root.startsWith(join(tmpdir(), 'clipzone-credential-fixture-')))
    await rm(root, {recursive: true, force: true})
  })
  const directory = join(root, 'credentials'), repositoryRoot = join(root, 'repository'), backup = join(root, 'backup')
  await mkdir(directory); await mkdir(repositoryRoot); await mkdir(backup)
  const credentialFile = join(directory, 'synthetic.json')
  const data = {type: 'service_account', project_id: 'clipzone-db02a',
    client_email: 'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com',
    token_uri: 'https://oauth2.googleapis.com/token', private_key: keys.privateKey}
  await writeFile(credentialFile, JSON.stringify(data), {flag: 'wx'})
  return {root, directory, backup, data, credentialFile, repositoryRoot,
    signal: new AbortController().signal, verifyPrivateCredential: async () => true}
}
test('explicit synthetic credential yields working RS256 signer without returning credential fields', async t => {
  const f = await fixture(t), sign = await loadSnapshotSigner(f)
  assert.equal(typeof sign, 'function')
  const content = Buffer.from('synthetic-only')
  const signature = await sign(content)
  assert.equal(verify('RSA-SHA256', content, keys.publicKey, signature), true)
})
test('wrong identity, token endpoint, type and invalid key are refused with sanitized error', async t => {
  const f = await fixture(t)
  for (const value of [{project_id: 'other'}, {client_email: 'other@clipzone-db02a.iam.gserviceaccount.com'},
    {type: 'authorized_user'}, {token_uri: 'https://evil.invalid/token'}, {private_key: 'private synthetic invalid'}]) {
    await writeFile(f.credentialFile, JSON.stringify({...f.data, ...value}))
    await fail(() => loadSnapshotSigner(f))
  }
})
test('oversized, malformed and non-UTF8 credentials are refused', async t => {
  const f = await fixture(t)
  for (const content of [' '.repeat(24577), '{bad json', Buffer.from([0xff]), '[]', '{}']) {
    await writeFile(f.credentialFile, content)
    await fail(() => loadSnapshotSigner(f))
  }
})
test('symlink, hard link, relative and repository files cannot supply credentials', async t => {
  const f = await fixture(t), symbolic = join(f.directory, 'symbolic.json')
  // Windows junction is a directory; use an ordinary file symlink where permitted.
  if (process.platform !== 'win32') {
    await symlink(f.credentialFile, symbolic)
    await fail(() => loadSnapshotSigner({...f, credentialFile: symbolic}))
  }
  await link(f.credentialFile, join(f.directory, 'hard.json'))
  await fail(() => loadSnapshotSigner(f))
  await fail(() => loadSnapshotSigner({...f, credentialFile: 'relative.json'}))
  const inRepository = join(f.repositoryRoot, 'synthetic.json')
  await writeFile(inRepository, JSON.stringify(f.data))
  await fail(() => loadSnapshotSigner({...f, credentialFile: inRepository}))
})
test('denied, revoked or missing ACL contract and pre-cancelled operation refuse credentials', async t => {
  const f = await fixture(t)
  await fail(() => loadSnapshotSigner({...f, verifyPrivateCredential: async () => false}))
  await fail(() => loadSnapshotSigner({...f, verifyPrivateCredential: undefined}))
  let calls = 0
  await fail(() => loadSnapshotSigner({...f, verifyPrivateCredential: async () => ++calls === 1}))
  const controller = new AbortController(); controller.abort()
  await fail(() => loadSnapshotSigner({...f, signal: controller.signal}))
})
test('loaded synthetic signer cannot be used after operation cancellation', async t => {
  const f = await fixture(t), controller = new AbortController()
  const sign = await loadSnapshotSigner({...f, signal: controller.signal})
  controller.abort()
  await assert.rejects(() => sign(Buffer.from('synthetic')), /^Error: snapshot-credential-unavailable$/)
})
test('operational entry signs with synthetic key, checks real Windows ACL and writes verified synthetic snapshot',
  {skip: process.platform !== 'win32'}, async t => {
    const f = await fixture(t)
    const script = `
$ErrorActionPreference = 'Stop'
$root = $env:CLIPZONE_CREDENTIAL_FIXTURE_ROOT
if ([IO.Path]::GetFileName($root) -notlike 'clipzone-credential-fixture-*') {throw 'refused'}
foreach ($leaf in @('credentials', 'backup')) {
 $path = [IO.Path]::Combine($root, $leaf)
 $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl = [Security.AccessControl.DirectorySecurity]::new()
 $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true, $false)
 foreach ($who in @($sid, [Security.Principal.SecurityIdentifier]'S-1-5-18')) {
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($who, [Security.AccessControl.FileSystemRights]::FullControl, [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit', [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow))
 }
 [IO.Directory]::SetAccessControl($path, $acl)
}
`
    await promisify(execFile)(resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {windowsHide: true, timeout: 10000, maxBuffer: 4096,
        env: {...process.env, CLIPZONE_CREDENTIAL_FIXTURE_ROOT: f.root}})
    assert.equal(await verifyWindowsSnapshotCredential(f.credentialFile), true)
    const at = '2026-10-26T12:00:00Z'; let oauth = 0, reads = 0, exchangeSignal
    const options = {projectId: 'clipzone-db02a', databaseId: '(default)', directory: f.backup,
      repositoryRoot: f.repositoryRoot, credentialFile: f.credentialFile, basename: 'synthetic-backup',
      readTime: at, now: () => new Date(at), limits: {documents: 10, requests: 20, responseBytes: 100000},
      maxFileBytes: 100000, timeoutMs: 30000, signal: new AbortController().signal,
      oauthExchange: async (url, init) => {
        oauth++; exchangeSignal = init.signal
        assert.equal(url, 'https://oauth2.googleapis.com/token')
        const assertion = new URLSearchParams(init.body).get('assertion'), parts = assertion.split('.')
        assert.equal(verify('RSA-SHA256', Buffer.from(parts.slice(0, 2).join('.')), keys.publicKey,
          Buffer.from(parts[2], 'base64url')), true)
        return Response.json({access_token: 'synthetic.token', token_type: 'Bearer', expires_in: 3600})
      },
      firestoreRead: async (url, init) => {
        reads++; assert.equal(url, 'https://firestore.googleapis.com/v1/projects/clipzone-db02a/databases/(default)/documents:listCollectionIds')
        assert.equal(init.method, 'POST'); assert.equal(init.headers.Authorization, 'Bearer synthetic.token')
        return Response.json({collectionIds: []})
      }}
    const result = await backupFromCredential(options)
    assert.equal(result.status, 'verified'); assert.equal(result.documents, 0)
    assert.equal(oauth, 1); assert.equal(reads, 1); assert.equal(exchangeSignal.aborted, true)
    assert.deepEqual(JSON.parse(await readFile(result.path, 'utf8')).documents, [])
    await assert.rejects(() => backupFromCredential(options), /^Error: private-backup-not-verified$/)
    assert.equal(oauth, 1); assert.equal(reads, 1)
    assert.deepEqual(await readdir(f.backup), ['synthetic-backup.snapshot.json'])
    const weakenOnlySyntheticFile = `
$ErrorActionPreference = 'Stop'
$file = $env:CLIPZONE_CREDENTIAL_SYNTHETIC_FILE
if ([IO.Path]::GetFileName($file) -ne 'synthetic.json' -or [IO.Path]::GetFileName([IO.Path]::GetDirectoryName([IO.Path]::GetDirectoryName($file))) -notlike 'clipzone-credential-fixture-*') {throw 'refused'}
$acl = [IO.File]::GetAccessControl($file)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]'S-1-1-0', [Security.AccessControl.FileSystemRights]::Read, [Security.AccessControl.AccessControlType]::Allow))
[IO.File]::SetAccessControl($file, $acl)
`
    await promisify(execFile)(resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(weakenOnlySyntheticFile, 'utf16le').toString('base64')],
      {windowsHide: true, timeout: 10000, maxBuffer: 4096,
        env: {...process.env, CLIPZONE_CREDENTIAL_SYNTHETIC_FILE: f.credentialFile}})
    assert.equal(await verifyWindowsSnapshotCredential(f.credentialFile), false)
    await assert.rejects(() => backupFromCredential({...options, basename: 'must-not-exist'}), /^Error: private-backup-not-verified$/)
    assert.equal(oauth, 1); assert.equal(reads, 1)
    assert.deepEqual(await readdir(f.backup), ['synthetic-backup.snapshot.json'])
  })
