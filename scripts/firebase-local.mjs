import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { resolve, delimiter } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const action = process.argv[2]
const testFile = process.argv[3]
if (testFile && (action !== 'test' || !/^[a-z0-9-]+\.test\.mjs$/.test(testFile))) throw new Error('Nome de teste inválido')
const testTarget = testFile ? 'tests/firestore/' + testFile : 'tests/firestore/*.test.mjs'
if (!['start', 'test'].includes(action)) throw new Error('Use start ou test')
const env = { ...process.env, FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' }
const javaRoot = resolve(root, '.tools/java')
if (existsSync(javaRoot)) {
  const folder = readdirSync(javaRoot).find(name => existsSync(resolve(javaRoot, name, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')))
  if (folder) {
    env.JAVA_HOME = resolve(javaRoot, folder)
    env.PATH = resolve(env.JAVA_HOME, 'bin') + delimiter + (env.PATH || env.Path || '')
    delete env.Path
  }
}
const project = action === 'test' ? 'demo-clipzone-tests' : 'demo-clipzone'
const args = [resolve(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
  action === 'test' ? 'emulators:exec' : 'emulators:start', '--only', 'firestore', '--project', project]
if (action === 'test') args.push('--config', 'firebase.test.json', 'node --test --test-concurrency=1 ' + testTarget)
else {
  args.push('--export-on-exit=.emulator-data')
  if (existsSync(resolve(root, '.emulator-data/firebase-export-metadata.json'))) args.push('--import=.emulator-data')
}
const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
