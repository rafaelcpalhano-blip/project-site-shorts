import {capturePrivateBackup} from './capture-private-backup.ts'
import {checkPrivateSnapshotDestination} from './private-snapshot-writer.ts'
import {loadSnapshotSigner} from './load-snapshot-signer.ts'
import {verifyWindowsSnapshotDirectory} from './windows-snapshot-directory.ts'
import {verifyWindowsSnapshotCredential} from './windows-snapshot-credential.ts'

/** Operational library, no automatic execution, CLI or default HTTP. Real use
 * reads the explicitly supplied private key and remote source, requiring approval.
 */
export async function backupFromCredential(input: Omit<Parameters<typeof capturePrivateBackup>[0], 'sign' | 'verifyPrivateDirectory'> & {
  credentialFile: string
}) {
  const stop = new AbortController()
  try {
    const options = {...input, limits: {...input.limits}}
    if (!(options.signal instanceof AbortSignal) || !Number.isSafeInteger(options.timeoutMs) ||
        options.timeoutMs < 1 || options.timeoutMs > 120000 || options.projectId !== 'clipzone-db02a' ||
        options.databaseId !== '(default)' || typeof options.oauthExchange !== 'function' ||
        typeof options.firestoreRead !== 'function' || typeof options.now !== 'function' ||
        !Number.isSafeInteger(options.maxFileBytes) || options.maxFileBytes < 1 || options.maxFileBytes > 8388608) throw Error()
    for (const [key, ceiling] of [['requests', 250], ['documents', 500], ['responseBytes', 5242880]] as const) {
      if (!Number.isSafeInteger(options.limits[key]) || options.limits[key] < 1 || options.limits[key] > ceiling) throw Error()
    }
    const signal = AbortSignal.any([options.signal, stop.signal, AbortSignal.timeout(options.timeoutMs)])
    signal.throwIfAborted()
    await checkPrivateSnapshotDestination({...options, verifyPrivateDirectory: verifyWindowsSnapshotDirectory})
    const sign = await loadSnapshotSigner({credentialFile: options.credentialFile,
      repositoryRoot: options.repositoryRoot, signal, verifyPrivateCredential: verifyWindowsSnapshotCredential})
    return await capturePrivateBackup({...options, sign, signal, verifyPrivateDirectory: verifyWindowsSnapshotDirectory})
  } catch { throw Error('private-backup-not-verified') }
  finally { stop.abort() }
}
