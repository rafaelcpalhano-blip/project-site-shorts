import { spawn } from 'node:child_process'
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'],
  { stdio: 'inherit', windowsHide: true, env: { ...process.env, VITE_DATA_MODE: 'firestore-emulator' } })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })

