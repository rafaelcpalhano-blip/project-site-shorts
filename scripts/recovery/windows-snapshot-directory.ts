import {execFile} from 'node:child_process'
import {lstat, realpath} from 'node:fs/promises'
import {isAbsolute, parse, resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'

/** Read-only, conservative Windows ACL gate for the local snapshot writer.
 * Exactly current owner + SYSTEM, both explicit FullControl inherited by files
 * and subdirectories; no inherited ACEs or other trustees. No ACL changes.
 */
export async function verifyWindowsSnapshotDirectory(directory: string): Promise<boolean> {
  try {
    if (process.platform !== 'win32' || !isAbsolute(directory) || directory.startsWith('\\\\') ||
        [...directory].some(char => char.charCodeAt(0) < 32)) return false
    const target = resolve(directory)
    let current = parse(target).root
    for (const part of target.slice(current.length).split(sep).filter(Boolean)) {
      current = resolve(current, part)
      const entry = await lstat(current)
      if (!entry.isDirectory() || entry.isSymbolicLink()) return false
    }
    if (await realpath(target) !== target) return false
    const systemRoot = process.env.SystemRoot
    if (!systemRoot || !isAbsolute(systemRoot)) return false
    const executable = resolve(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe')
    const script = fileURLToPath(new URL('./verify-private-snapshot-directory.ps1', import.meta.url))
    const result = await new Promise<string>((accept, reject) => {
      execFile(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script,
        '-LiteralDirectory', target], {windowsHide: true, timeout: 10000, maxBuffer: 4096, encoding: 'utf8'},
      (error, stdout, stderr) => error || stderr.trim() ? reject(Error('acl-unavailable')) : accept(stdout))
    })
    const receipt: unknown = JSON.parse(result.trim())
    return !!receipt && typeof receipt === 'object' && Object.keys(receipt).length === 2 &&
      'schema' in receipt && receipt.schema === 1 && 'private' in receipt && receipt.private === true
  } catch { return false }
}
