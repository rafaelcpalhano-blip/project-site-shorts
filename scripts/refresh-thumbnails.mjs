// Local maintenance only: one batch of 30, no scheduler, cloud writes or image downloads.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createConfiguredVideoVerifier} from '../server/videos/configured.ts'
import {createTwitchClipVerifier} from '../server/videos/twitch.ts'
import {createIgdbCatalog} from '../server/games/igdb.ts'
import {refreshThumbnails} from '../server/videos/refresh-thumbnails.ts'
const [mode,after,...extra]=process.argv.slice(2)
if(!['inspect','apply'].includes(mode)||extra.length||after!==undefined&&!/^[-_a-zA-Z0-9]{1,128}$/.test(after))throw Error('Use inspect|apply [AFTER_ID]')
try{
 const clientId=process.env.TWITCH_CLIENT_ID?.trim(),clientSecret=process.env.TWITCH_CLIENT_SECRET?.trim()
 const catalog=clientId&&clientSecret?createIgdbCatalog({clientId,clientSecret}):undefined
 const twitch=catalog?createTwitchClipVerifier({clientId,accessToken:catalog.accessToken}):undefined
 const result=await refreshThumbnails({store:createRestStore({projectId:'demo-clipzone',emulatorPort:8080}),verify:createConfiguredVideoVerifier({twitch,youtubeApiKey:process.env.YOUTUBE_API_KEY}),now:()=>new Date(),apply:mode==='apply',after})
 console.log(JSON.stringify(result))
}catch{console.error('Manutenção de miniaturas indisponível. Nenhuma credencial ou URL assinada foi exibida.');process.exitCode=1}
