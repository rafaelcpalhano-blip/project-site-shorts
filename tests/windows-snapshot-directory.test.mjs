import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, rm, readFile, symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {verifyWindowsSnapshotDirectory} from '../scripts/recovery/windows-snapshot-directory.ts'
import {writePrivateSnapshot} from '../scripts/recovery/private-snapshot-writer.ts'
import {recoveryFixture} from './helpers/snapshot-recovery-fixture.ts'
const exec = promisify(execFile)
const windowsOnly = {skip: process.platform !== 'win32'}

// Creates/changes ACLs ONLY on a newly allocated disposable fixture directory.
// No user backup, repository, credential folder, parent ACL or remote access.
async function fixture(t, mode = 'private') {
  const root = await mkdtemp(join(tmpdir(), 'clipzone-acl-fixture-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const directory = join(root, 'synthetic'), repositoryRoot = join(root, 'repository')
  await mkdir(directory); await mkdir(repositoryRoot)
  if (mode !== 'inherited') {
    const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$path = $env:CLIPZONE_SYNTHETIC_ACL_PATH
if ([IO.Path]::GetFileName($path) -ne 'synthetic' -or [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($path)) -notlike 'clipzone-acl-fixture-*') { throw 'invalid fixture' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
foreach ($who in @($sid, [Security.Principal.SecurityIdentifier]'S-1-5-18')) {
 $inherit = if ($env:CLIPZONE_SYNTHETIC_ACL_MODE -eq 'no-file-inherit') { [Security.AccessControl.InheritanceFlags]::ContainerInherit } else { [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' }
 $rule = [Security.AccessControl.FileSystemAccessRule]::new($who, [Security.AccessControl.FileSystemRights]::FullControl, $inherit, [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
 $acl.AddAccessRule($rule)
}
if ($env:CLIPZONE_SYNTHETIC_ACL_MODE -eq 'extra-reader') {
 $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]'S-1-1-0', [Security.AccessControl.FileSystemRights]::ReadAndExecute, [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit', [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow))
}
[IO.Directory]::SetAccessControl($path, $acl)
`
    await exec(resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {windowsHide: true, timeout: 10000, maxBuffer: 4096,
        env: {...process.env, CLIPZONE_SYNTHETIC_ACL_PATH: directory, CLIPZONE_SYNTHETIC_ACL_MODE: mode}})
  }
  return {root, directory, repositoryRoot}
}

test('real Windows ACL gate accepts only the private fixture without exposing identities', windowsOnly, async t => {
  const f = await fixture(t)
  assert.equal(await verifyWindowsSnapshotDirectory(f.directory), true)
  assert.equal(await verifyWindowsSnapshotDirectory(f.directory), true)
})
test('real Windows ACL gate refuses inherited permissions', windowsOnly, async t => {
  const f = await fixture(t, 'inherited')
  assert.equal(await verifyWindowsSnapshotDirectory(f.directory), false)
})
test('real Windows ACL gate refuses additional Everyone reader', windowsOnly, async t => {
  const f = await fixture(t, 'extra-reader')
  assert.equal(await verifyWindowsSnapshotDirectory(f.directory), false)
})
test('real Windows ACL gate requires inheritance onto files as well as directories', windowsOnly, async t => {
  const f = await fixture(t, 'no-file-inherit')
  assert.equal(await verifyWindowsSnapshotDirectory(f.directory), false)
})
test('real Windows ACL gate refuses junction, relative, missing and malformed targets', windowsOnly, async t => {
  const f = await fixture(t), alias = join(f.root, 'alias')
  await symlink(f.directory, alias, 'junction')
  for (const path of [alias, 'relative', join(f.root, 'absent'), f.directory + '\0', '\\\\server\\share']) {
    assert.equal(await verifyWindowsSnapshotDirectory(path), false)
  }
})
test('writer composes with real Windows ACL check using only synthetic snapshot', windowsOnly, async t => {
  const f = await fixture(t), snapshot = await recoveryFixture()
  const result = await writePrivateSnapshot({...f, snapshot, projectId: 'demo-clipzone-tests',
    databaseId: '(default)', basename: 'acl-fixture', maxBytes: 100000,
    verifyPrivateDirectory: verifyWindowsSnapshotDirectory})
  assert.equal(result.status, 'verified')
  assert.deepEqual(JSON.parse(await readFile(result.path, 'utf8')), snapshot)
  const script = `
$ErrorActionPreference = 'Stop'
$acl = [IO.File]::GetAccessControl($env:CLIPZONE_SYNTHETIC_SNAPSHOT_FILE)
$type = [Security.Principal.SecurityIdentifier]
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$rules = @($acl.GetAccessRules($true, $true, $type))
$ok = $acl.GetOwner($type).Value -eq $sid -and $rules.Count -eq 2
foreach ($rule in $rules) {
 if (($rule.IdentityReference.Value -ne $sid -and $rule.IdentityReference.Value -ne 'S-1-5-18') -or
     -not $rule.IsInherited -or [int]$rule.FileSystemRights -ne 2032127 -or [int]$rule.AccessControlType -ne 0) { $ok = $false }
}
[Console]::Out.WriteLine($(if ($ok) { 'private' } else { 'refused' }))
`
  const receipt = await exec(resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
    {windowsHide: true, timeout: 10000, maxBuffer: 4096,
      env: {...process.env, CLIPZONE_SYNTHETIC_SNAPSHOT_FILE: result.path}})
  assert.equal(receipt.stdout.trim(), 'private')
})
