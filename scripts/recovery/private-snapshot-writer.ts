import {randomUUID} from 'node:crypto'
import {lstat, realpath, open, link, unlink} from 'node:fs/promises'
import {isAbsolute, parse, relative, resolve, sep} from 'node:path'
import {verifyFirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'
import type {FirestoreSnapshot} from '../../server/recovery/read-only-snapshot.ts'

type Source = Pick<FirestoreSnapshot, 'projectId' | 'databaseId'>
const refused = () => new Error('snapshot-file-not-verified')
const inside = (parent: string, child: string) => {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))
}

async function plainDirectory(directory: string) {
  const target = resolve(directory)
  let current = parse(target).root
  for (const part of target.slice(current.length).split(sep).filter(Boolean)) {
    current = resolve(current, part)
    const entry = await lstat(current)
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw refused()
  }
  return realpath(target)
}

async function readExact(path: string, expected: Buffer, maximum: number) {
  if (!(await lstat(path)).isFile() || (await lstat(path)).isSymbolicLink()) throw refused()
  const file = await open(path, 'r')
  try {
    const before = await file.stat()
    if (!before.isFile() || before.size !== expected.length || before.size > maximum) throw refused()
    const bytes = Buffer.alloc(expected.length + 1)
    let offset = 0
    while (offset < bytes.length) {
      const result = await file.read(bytes, offset, bytes.length - offset, offset)
      if (result.bytesRead === 0) break
      offset += result.bytesRead
    }
    const after = await file.stat()
    if (offset !== expected.length || after.size !== before.size || !bytes.subarray(0, offset).equals(expected)) throw refused()
    return JSON.parse(bytes.subarray(0, offset).toString('utf8')) as FirestoreSnapshot
  } finally { await file.close() }
}

/** Local library only: no CLI, token source, capture, default ACL policy or network.
 * The caller must provide an independently reviewed directory ACL check. A true
 * return is a contract, not proof supplied by this library. Never use with an
 * untrusted directory/writer; path checks do not provide a filesystem lock.
 */
export async function writePrivateSnapshot(options: Source & {
  snapshot: FirestoreSnapshot
  directory: string
  repositoryRoot: string
  basename: string
  maxBytes: number
  verifyPrivateDirectory: (canonicalDirectory: string) => Promise<boolean>
}) {
  try {
    const snapshot = structuredClone(options.snapshot)
    const {projectId, databaseId, maxBytes, basename} = options
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 33554432 ||
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(basename) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(basename) ||
        !isAbsolute(options.directory) || !isAbsolute(options.repositoryRoot) ||
        typeof options.verifyPrivateDirectory !== 'function') throw refused()
    await verifyFirestoreSnapshot(snapshot, {projectId, databaseId})
    const bytes = Buffer.from(JSON.stringify(snapshot) + '\n', 'utf8')
    if (bytes.length > maxBytes) throw refused()
    const directory = await plainDirectory(options.directory)
    const repository = await realpath(options.repositoryRoot)
    if (inside(repository, directory)) throw refused()
    const guard = async () => {
      if (await plainDirectory(options.directory) !== directory ||
          await options.verifyPrivateDirectory(directory) !== true) throw refused()
    }
    await guard()
    const finalPath = resolve(directory, basename + '.snapshot.json')
    // Refuse an existing file, directory, symlink or junction before creating a partial.
    try { await lstat(finalPath); throw refused() } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw refused()
    }
    const partialPath = resolve(directory, basename + '.' + randomUUID() + '.partial')
    const file = await open(partialPath, 'wx', 0o600)
    try { await file.writeFile(bytes); await file.sync() } finally { await file.close() }
    await guard()
    await verifyFirestoreSnapshot(await readExact(partialPath, bytes, maxBytes), {projectId, databaseId})
    await guard()
    // Hard link creates the final name exclusively; never rename over an existing file.
    // Both names are in the same private directory. Unsupported filesystems fail closed.
    await link(partialPath, finalPath)
    await guard()
    await verifyFirestoreSnapshot(await readExact(finalPath, bytes, maxBytes), {projectId, databaseId})
    let partialRetained = false
    try { await unlink(partialPath) } catch { partialRetained = true }
    return {status: 'verified' as const, path: finalPath, bytes: bytes.length,
      documents: snapshot.documents.length, sha256: snapshot.sha256, partialRetained}
  } catch {
    // An error may leave a partial or a final name. Never erase/retry automatically
    // and never expose filesystem errors, paths or document contents to logs.
    throw refused()
  }
}
