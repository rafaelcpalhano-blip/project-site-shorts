// Scoped regression groups for the approved 7.6.10 plan. No real-cloud credentials or database resets.
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
const groups={
  "A": [
    "game-catalog-cache",
    "ordered-feed-concurrency",
    "short-sequence-components",
    "admin-session"
  ],
  "B": [
    "clipper-interaction",
    "clipper-community",
    "clipper-welcome",
    "clipper-communication",
    "card-artwork",
    "short-sequence-components"
  ],
  "C": [
    "thumbnails",
    "card-artwork",
    "short-sequence-components",
    "official-player",
    "twitch-mobile-layout"
  ],
  "D": [
    "game-catalog-cache",
    "game-catalog-client",
    "mobile-recovery",
    "shared-video-links",
    "video-preview",
    "submission-client",
    "youtube-preview-recovery",
    "tiktok-profile-preview",
    "admin-session",
    "admin-auth"
  ],
  "E": [
    "game-catalog-cache",
    "ordered-feed-concurrency",
    "short-sequence-components",
    "admin-session",
    "clipper-interaction",
    "clipper-community",
    "clipper-welcome",
    "clipper-communication",
    "card-artwork",
    "thumbnails",
    "official-player",
    "twitch-mobile-layout",
    "game-catalog-client",
    "mobile-recovery",
    "shared-video-links",
    "video-preview",
    "submission-client",
    "youtube-preview-recovery",
    "tiktok-profile-preview",
    "admin-auth",
    "short-sequence",
    "player-audio",
    "mobile-interactions",
    "game-panel-position"
  ]
}
const root=fileURLToPath(new URL('../',import.meta.url))
const args=process.argv.slice(2),group=(args[0]??'').toUpperCase()
if(args.length===1&&args[0]==='--list'){
 console.log(JSON.stringify(groups,null,2))
}else if(args.length!==1||!Object.hasOwn(groups,group)){
 console.error('Uso: node scripts/test-performance.mjs A|B|C|D|E ou --list');process.exitCode=1
}else{
 const files=groups[group].map(name=>'tests/'+name+'.test.mjs')
 const missing=files.filter(name=>!existsSync(new URL('../'+name,import.meta.url)))
 if(missing.length){console.error('Testes ausentes: '+missing.join(', '));process.exitCode=1}
 else{
  console.log('Regressão '+group+': '+files.length+' arquivos; sem emulador real ou Lighthouse.')
  const child=spawn(process.execPath,['--test','--test-concurrency=2',...files],{cwd:root,stdio:'inherit',shell:false})
  child.on('error',error=>{console.error(error.message);process.exitCode=1})
  child.on('exit',(code,signal)=>{process.exitCode=signal?1:code??1})
 }
}
