import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, readdir, readFile, writeFile, rm, symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {writePrivateSnapshot} from '../scripts/recovery/private-snapshot-writer.ts'
import {recoveryFixture} from './helpers/snapshot-recovery-fixture.ts'

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'clipzone-synthetic-writer-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const directory = join(root, 'private-fixture'), repositoryRoot = join(root, 'repository-fixture')
  await mkdir(directory); await mkdir(repositoryRoot)
  return {snapshot: await recoveryFixture(), projectId: 'demo-clipzone-tests', databaseId: '(default)', directory, repositoryRoot, basename: 'fixture',
    maxBytes: 100000, verifyPrivateDirectory: async () => true}
}
const rejected = operation => assert.rejects(operation, /^Error: snapshot-file-not-verified$/)

test('writer saves exact synthetic wire values, rereads and verifies, leaves no partial on success', async t => {
  const options = await setup(t), result = await writePrivateSnapshot(options)
  assert.equal(result.status, 'verified'); assert.equal(result.documents, 4)
  assert.equal(result.partialRetained, false)
  const saved = JSON.parse(await readFile(result.path, 'utf8'))
  assert.deepEqual(saved, options.snapshot)
  assert.deepEqual(await readdir(options.directory), ['fixture.snapshot.json'])
})

test('writer refuses existing final without changing it or creating partial', async t => {
  const options = await setup(t), final = join(options.directory, 'fixture.snapshot.json')
  await writeFile(final, 'existing fixture')
  await rejected(() => writePrivateSnapshot(options))
  assert.equal(await readFile(final, 'utf8'), 'existing fixture')
  assert.deepEqual(await readdir(options.directory), ['fixture.snapshot.json'])
})

test('writer rejects tampering, byte limits, unsafe names, paths and absent ACL contract before writing', async t => {
  const options = await setup(t)
  for (const override of [{snapshot: {...options.snapshot, sha256: '0'.repeat(64)}},
    {maxBytes: 1}, {maxBytes: NaN}, {basename: '../escape'}, {basename: 'secret.env'},
    {basename: 'con'}, {basename: 'lpt1'}, {projectId: undefined}, {databaseId: undefined},
    {directory: 'relative'}, {verifyPrivateDirectory: undefined},
    {verifyPrivateDirectory: async () => false},
    {verifyPrivateDirectory: async () => {throw Error('private detail')}},
    {directory: options.repositoryRoot}]) await rejected(() => writePrivateSnapshot({...options, ...override}))
  assert.deepEqual(await readdir(options.directory), [])
  assert.deepEqual(await readdir(options.repositoryRoot), [])
})

test('writer refuses directory junction instead of following it', async t => {
  const options = await setup(t), alias = join(options.repositoryRoot, 'alias')
  await symlink(options.directory, alias, process.platform === 'win32' ? 'junction' : 'dir')
  await rejected(() => writePrivateSnapshot({...options, directory: alias}))
  assert.deepEqual(await readdir(options.directory), [])
})

test('writer retains unverified partial on corruption and does not publish final', async t => {
  const options = await setup(t); let checks = 0
  options.verifyPrivateDirectory = async () => {
    if (++checks === 2) {
      const files = await readdir(options.directory)
      await writeFile(join(options.directory, files[0]), 'corrupt synthetic fixture')
    }
    return true
  }
  await rejected(() => writePrivateSnapshot(options))
  const files = await readdir(options.directory)
  assert.equal(files.length, 1); assert.ok(files[0].endsWith('.partial'))
})

test('writer rechecks permission contract after writing and keeps partial if revoked', async t => {
  const options = await setup(t); let checks = 0
  options.verifyPrivateDirectory = async () => ++checks === 1
  await rejected(() => writePrivateSnapshot(options))
  const files = await readdir(options.directory)
  assert.equal(files.length, 1); assert.ok(files[0].endsWith('.partial'))
})

test('concurrent final creation is never overwritten, partial is retained without retry', async t => {
  const options = await setup(t); let checks = 0
  const final = join(options.directory, 'fixture.snapshot.json')
  options.verifyPrivateDirectory = async () => {
    if (++checks === 3) await writeFile(final, 'concurrent fixture', {flag: 'wx'})
    return true
  }
  await rejected(() => writePrivateSnapshot(options))
  assert.equal(await readFile(final, 'utf8'), 'concurrent fixture')
  assert.equal((await readdir(options.directory)).length, 2)
})

test('failed final verification does not report success or automatically delete either name', async t => {
  const options = await setup(t); let checks = 0
  options.verifyPrivateDirectory = async () => {
    if (++checks === 4) await writeFile(join(options.directory, 'fixture.snapshot.json'), 'corrupt fixture')
    return true
  }
  await rejected(() => writePrivateSnapshot(options))
  assert.equal((await readdir(options.directory)).length, 2)
})

test('input mutation during asynchronous ACL check cannot change the saved snapshot', async t => {
  const options = await setup(t), expected = structuredClone(options.snapshot)
  options.verifyPrivateDirectory = async () => { options.snapshot.documents.length = 0; return true }
  const result = await writePrivateSnapshot(options)
  assert.deepEqual(JSON.parse(await readFile(result.path, 'utf8')), expected)
})
