import fs from 'node:fs'
import cp from 'node:child_process'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

// No provider calls, credential discovery, fixes, Git writes or secret values in output.
export function inspectRepositoryText(name,text){
 const findings=[],file=name.replaceAll('\\','/'),base=file.split('/').at(-1)
 if((/^\.env(?:\.|$)/i.test(base)&&base!=='.env.example')||/^\.dev\.vars(?:\.|$)/i.test(base)||/\.(?:pem|key|p12|pfx)$/i.test(base)||/(?:service[-_]account).*\.json$/i.test(base)||/^(?:credentials|clipzone-runtime)\.json$/i.test(base)||/(?:^|\/)(?:credentials|backups|private-backups|firebase-export-[^/]+|\.emulator-data|\.wrangler)(?:\/|$)/i.test(file))findings.push({code:'private-file',line:1})
 const patterns=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----(?:\r?\n|\\n)[A-Za-z0-9+/=\r\n\\]{40,}(?:\r?\n|\\n)-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['provider-key-needs-review',/AIza[0-9A-Za-z_-]{35}|GOCSPX-[A-Za-z0-9_-]{15,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['signed-token-needs-review',/eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/g],
  ['server-secret-assignment',/(?:CLIPZONE_(?:VISITOR|NETWORK)_SECRET|CLOUDFLARE_AI_TOKEN|TWITCH_CLIENT_SECRET|YOUTUBE_API_KEY)\s*["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{24,}/g],
  ['hmac-secret-assignment',/(?:visitorSecret|networkSecret)\s*["']?\s*[:=]\s*["'][a-fA-F0-9]{64}["']/g],
 ]
 for(const [code,re]of patterns)for(const match of text.matchAll(re))findings.push({code,line:text.slice(0,match.index).split('\n').length})
 return findings
}

export function checkRepository({root=process.cwd(),history=false}={}){
 const git=(args,input)=>cp.execFileSync('git',['--no-optional-locks',...args],{cwd:root,input,windowsHide:true,maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']})
 const findings=[],safe=name=>name.replace(/[\x00-\x1f\x7f]/g,'?')
 const scan=(name,bytes,extra={})=>{
  // Inspect the path even for binary files; don't follow filesystem symlinks.
  for(const found of inspectRepositoryText(name,bytes.includes(0)?'':bytes.toString('utf8')))findings.push({file:safe(name),...extra,...found})
 }
 const names=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(Boolean))]
 for(const name of names){const file=path.resolve(root,name);if(!file.startsWith(path.resolve(root)+path.sep))throw Error('repository-path-refused');let info;try{info=fs.lstatSync(file)}catch(error){if(error.code==='ENOENT')continue;throw error}
  if(info.isSymbolicLink()){findings.push({file:safe(name),code:'symlink-needs-review',line:1});continue}
  if(!info.isFile()||info.size>8*1024*1024){findings.push({file:safe(name),code:'file-needs-review',line:1});continue}
  scan(name,fs.readFileSync(file))
 }
 let historicalBlobs=0
 if(history){
  const objects=git(['rev-list','--objects','--all']).toString().trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf(' ');return {id:i<0?line:line.slice(0,i),name:i<0?'':line.slice(i+1)}})
  const objectNames=new Map(objects.map(o=>[o.id,o.name]))
  const meta=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],objects.map(o=>o.id).join('\n')+'\n').toString().trim().split('\n')
  const blobs=meta.filter(line=>line.split(' ')[1]==='blob').map(line=>line.split(' ')[0]),data=git(['cat-file','--batch'],blobs.join('\n')+'\n');let offset=0
  for(const id of blobs){const end=data.indexOf(10,offset),header=data.subarray(offset,end).toString(),size=Number(header.split(' ')[2]);if(end<0||!Number.isSafeInteger(size)||size<0||end+size+1>=data.length)throw Error('repository-history-unavailable');scan(objectNames.get(id)??'',data.subarray(end+1,end+1+size),{blob:id});offset=end+size+2;historicalBlobs++}
  // Commit messages are not file blobs. Keep provider tokens out of them too.
  const commits=git(['log','--all','--format=%H%x00%B%x00']).toString().split('\0')
  for(let n=0;n+1<commits.length;n+=2){const id=commits[n].trim();if(/^[a-f0-9]{40}$/.test(id))scan('(commit-message)',Buffer.from(commits[n+1]),{commit:id})}
 }
 return {workingFiles:names.length,historicalBlobs,findings}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{if(process.argv.slice(2).some(arg=>arg!=='--history'))throw Error('invalid-argument');const result=checkRepository({history:process.argv.includes('--history')});console.log(JSON.stringify(result,null,2));if(result.findings.length)process.exitCode=1}
 catch{console.error('repository-security-check-unavailable; no secret values printed');process.exitCode=2}
}
