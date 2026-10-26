import {execFile} from 'node:child_process'
import {lstat, realpath} from 'node:fs/promises'
import {dirname, isAbsolute, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {verifyWindowsSnapshotDirectory} from './windows-snapshot-directory.ts'

/** Read-only ACL check; no file content is read or ACL changed. */
export async function verifyWindowsSnapshotCredential(file: string): Promise<boolean> {
  try {
    if (process.platform !== 'win32' || !isAbsolute(file) || file.startsWith('\\\\') ||
        [...file].some(char => char.charCodeAt(0) < 32)) return false
    const target = resolve(file), info = await lstat(target)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || await realpath(target) !== target ||
        !await verifyWindowsSnapshotDirectory(dirname(target))) return false
    if (!process.env.SystemRoot || !isAbsolute(process.env.SystemRoot)) return false
    const executable = resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe')
    const script = fileURLToPath(new URL('./verify-private-snapshot-credential.ps1', import.meta.url))
    const stdout = await new Promise<string>((accept, reject) => {
      execFile(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script, '-LiteralFile', target],
        {windowsHide: true, timeout: 10000, maxBuffer: 4096, encoding: 'utf8'},
        (error, output, stderr) => error || stderr.trim() ? reject(Error('acl-unavailable')) : accept(output))
    })
    const receipt: unknown = JSON.parse(stdout.trim())
    return !!receipt && typeof receipt === 'object' && Object.keys(receipt).length === 2 &&
      'schema' in receipt && receipt.schema === 1 && 'private' in receipt && receipt.private === true
  } catch { return false }
}
