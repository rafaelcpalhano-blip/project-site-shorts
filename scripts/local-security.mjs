import {readFile,writeFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
export async function localSecuritySecrets(file=new URL('../.env.security.local',import.meta.url)){
 let values
 try{values=JSON.parse(await readFile(file,'utf8'))}catch(error){
  if(error.code!=='ENOENT')throw Error('invalid-local-security-secrets')
  const generated={visitor:randomBytes(32).toString('hex'),network:randomBytes(32).toString('hex')}
  try{await writeFile(file,JSON.stringify(generated)+'\n',{flag:'wx',mode:0o600});values=generated}catch(error){if(error.code!=='EEXIST')throw error;values=JSON.parse(await readFile(file,'utf8'))}
 }
 for(const key of ['visitor','network'])if(typeof values?.[key]!=='string'||!/^[a-f0-9]{64}$/.test(values[key]))throw Error('invalid-local-security-secrets')
 if(values.visitor===values.network)throw Error('invalid-local-security-secrets')
 return values
}
