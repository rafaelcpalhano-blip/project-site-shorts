import {lstat, open, realpath} from 'node:fs/promises'
import {isAbsolute, relative, resolve, sep} from 'node:path'
import {createServiceKeySigner} from '../../server/auth/service-key.ts'

/** Explicit file only: no environment discovery, CLI cache, logging or network.
 * Real file access requires approval. ACL callback must inspect file AND parent.
 */
export async function loadSnapshotSigner(input: {
  credentialFile: string; repositoryRoot: string; signal: AbortSignal
  verifyPrivateCredential: (canonicalFile: string) => Promise<boolean>
}): Promise<(content: Uint8Array) => Promise<Uint8Array>> {
  let bytes: Buffer | undefined
  try {
    const {credentialFile, repositoryRoot, signal, verifyPrivateCredential} = input
    if (!(signal instanceof AbortSignal) || !isAbsolute(credentialFile) || !isAbsolute(repositoryRoot) ||
        typeof verifyPrivateCredential !== 'function' || credentialFile.startsWith('\\\\') ||
        [...credentialFile].some(char => char.charCodeAt(0) < 32)) throw Error()
    signal.throwIfAborted()
    const path = resolve(credentialFile), info = await lstat(path), canonical = await realpath(path)
    const rel = relative(await realpath(repositoryRoot), canonical)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || canonical !== path ||
        rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)) ||
        info.size < 1 || info.size > 24576 || await verifyPrivateCredential(canonical) !== true) throw Error()
    signal.throwIfAborted()
    const file = await open(path, 'r')
    try {
      const before = await file.stat()
      if (!before.isFile() || before.nlink !== 1 || before.size !== info.size || before.ino !== info.ino) throw Error()
      bytes = Buffer.alloc(info.size + 1)
      let offset = 0
      while (offset < bytes.length) {
        signal.throwIfAborted()
        const read = await file.read(bytes, offset, bytes.length - offset, offset)
        if (read.bytesRead === 0) break
        offset += read.bytesRead
      }
      const after = await file.stat()
      if (offset !== info.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw Error()
      signal.throwIfAborted()
      const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(0, offset)))
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
      const fields = value as Record<string, unknown>
      if (fields.type !== 'service_account' || fields.project_id !== 'clipzone-db02a' ||
          fields.client_email !== 'clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com' ||
          fields.token_uri !== 'https://oauth2.googleapis.com/token' || typeof fields.private_key !== 'string') throw Error()
      const signer = createServiceKeySigner(fields.private_key)
      // Eagerly validate import/algorithm/size without sending anything externally.
      await signer(new TextEncoder().encode('Clipzone local backup signer validation v1'))
      signal.throwIfAborted()
      if (await verifyPrivateCredential(canonical) !== true) throw Error()
      return async content => {
        try {
          signal.throwIfAborted()
          const signature = await signer(content)
          signal.throwIfAborted()
          return signature
        } catch { throw Error('snapshot-credential-unavailable') }
      }
    } finally { await file.close() }
  } catch { throw Error('snapshot-credential-unavailable') }
  finally { bytes?.fill(0) } // JS strings/CryptoKey are not guaranteed erasable.
}
