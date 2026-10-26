// Local build only. Does not authenticate, connect to Firebase or deploy.
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {loadEnv} from 'vite'
const root=fileURLToPath(new URL('../',import.meta.url)),env={...process.env,VITE_DATA_MODE:'api'}
const visible={...loadEnv('production',root,'VITE_'),...Object.fromEntries(Object.entries(env).filter(([key])=>key.startsWith('VITE_')))}
if(Object.keys(visible).some(key=>key!=='VITE_DATA_MODE'))throw Error('Unexpected public environment variable; review before building')
for(const [script,args]of [['node_modules/typescript/bin/tsc',['-b']],['node_modules/typescript/bin/tsc',['-p','tsconfig.server.json']],['node_modules/vite/bin/vite.js',['build']]]){
 const result=spawnSync(process.execPath,[script,...args],{cwd:root,env,stdio:'inherit',windowsHide:true})
 if(result.error||result.status!==0){process.exitCode=result.status??1;break}
}
