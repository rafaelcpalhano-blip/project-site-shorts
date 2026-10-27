import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import cp from 'node:child_process'
import {inspectRepositoryText,checkRepository} from '../scripts/check-repository-security.mjs'
function removeFixture(temp){const target=path.resolve(temp);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&/^clipzone-(?:ignore|guard)-/.test(path.basename(target)));fs.rmSync(target,{recursive:true,force:true})}

test('repository secret guard reports only locations for realistic provider keys and PEM, not their values',()=>{
 const token='AI'+'za'+'aB12'.repeat(8)+'abc',pem='-----BEGIN PRIVATE KEY-----\n'+'ABcd'.repeat(32)+'\n-----END PRIVATE KEY-----'
 for(const value of [token,pem]){const findings=inspectRepositoryText('fixture.txt',value);assert.ok(findings.length);assert.ok(!JSON.stringify(findings).includes(value))}
 assert.deepEqual(inspectRepositoryText('server/key-format.ts',"const header='-----BEGIN PRIVATE KEY-----'; const key=generateKey()"),[])
 assert.deepEqual(inspectRepositoryText('.env.example','VITE_DATA_MODE=demo'),[])
})

test('gitignore protects local secrets and exports while keeping examples and source tracked',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clipzone-ignore-'))
 try{
  cp.execFileSync('git',['init','--quiet',temp],{windowsHide:true});fs.copyFileSync(new URL('../.gitignore',import.meta.url),path.join(temp,'.gitignore'))
  const blocked=['.env','.env.server.local','.env.security.local','.dev.vars','.dev.vars.production','private.pem','nested/key.key','credential.p12','credentials.json','clipzone-runtime.json','firebase-service-account.json','credentials/key.json','backups/snapshot.json','firebase-export-example/firestore_export/data','.wrangler/state/record.json','.emulator-data/records']
  const allowed=['.env.example','package-lock.json','server/auth/service-key.ts','tests/repository-security.test.mjs','docs/evidencias/etapa-8-f-backup-credencial.json']
  const result=cp.spawnSync('git',['check-ignore','--no-index','--stdin','-z'],{cwd:temp,input:[...blocked,...allowed].join('\0')+'\0',encoding:'utf8',windowsHide:true})
  assert.equal(result.status,0);assert.deepEqual(new Set(result.stdout.split('\0').filter(Boolean)),new Set(blocked))
 }finally{removeFixture(temp)}
})

test('working-tree guard rejects forced private files without reading ignored credentials or leaking content',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clipzone-guard-'))
 try{
  cp.execFileSync('git',['init','--quiet',temp],{windowsHide:true});fs.writeFileSync(path.join(temp,'.gitignore'),'.env\n');fs.writeFileSync(path.join(temp,'.env'),'private ignored value');fs.writeFileSync(path.join(temp,'credentials.json'),'private tracked value')
  const result=checkRepository({root:temp});assert.equal(result.findings[0].code,'private-file');assert.ok(!JSON.stringify(result).includes('private tracked value'));assert.equal(result.findings.some(x=>x.file==='.env'),false)
 }finally{removeFixture(temp)}
})

test('security CI stays read-only, SHA-pinned and isolated from deployment/provider secrets',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/security.yml',import.meta.url),'utf8')
 assert.match(workflow,/permissions:\s*\n\s+contents: read/)
 assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/timeout-minutes: 10/)
 assert.doesNotMatch(workflow,/pull_request_target|secrets\.|id-token:\s*write|write-all|firebase deploy|wrangler deploy|npm publish/)
 const actions=[...workflow.matchAll(/^\s*- uses: (\S+)/gm)].map(match=>match[1])
 assert.equal(actions.length,2);for(const action of actions)assert.match(action,/^actions\/(?:checkout|setup-node)@[a-f0-9]{40}$/)
 for(const command of ['npm ci --ignore-scripts','npm run security:check','npm run security:history','npm run security:audit','npm test','npm run build','npm run lint'])assert.ok(workflow.includes(command))
})
