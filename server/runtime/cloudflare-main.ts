import {createCloudflareApplication} from './cloudflare-application.ts'
import type {CloudflareApplicationConfiguration} from './cloudflare-application.ts'
import {serveStaticGameCover} from './static-game-cover.ts'

interface Environment {
 ASSETS:{fetch:(request:Request)=>Promise<Response>}
 CLIPZONE_ORIGIN:string;FIREBASE_PROJECT_ID:string;FIREBASE_AUTH_PROJECT_ID:string
 FIREBASE_SERVICE_EMAIL:string;FIREBASE_SERVICE_PRIVATE_KEY:string
 CLIPZONE_VISITOR_SECRET:string;CLIPZONE_NETWORK_SECRET:string
 FIREBASE_AUTH_API_KEY:string;FIREBASE_AUTH_APP_ID:string;CLIPZONE_ADMIN_UIDS:string
 TWITCH_CLIENT_ID:string;TWITCH_CLIENT_SECRET:string;YOUTUBE_API_KEY:string
 CLIPZONE_JOBS_ENABLED?:string
}
const applications=new WeakMap<Environment,{signature:string;app:ReturnType<typeof createCloudflareApplication>}>()
function application(env:Environment){
 const config:CloudflareApplicationConfiguration={origin:env.CLIPZONE_ORIGIN,projectId:env.FIREBASE_PROJECT_ID,authProjectId:env.FIREBASE_AUTH_PROJECT_ID,
  serviceEmail:env.FIREBASE_SERVICE_EMAIL,servicePrivateKey:env.FIREBASE_SERVICE_PRIVATE_KEY,visitorSecret:env.CLIPZONE_VISITOR_SECRET,networkSecret:env.CLIPZONE_NETWORK_SECRET,
  authApiKey:env.FIREBASE_AUTH_API_KEY,authAppId:env.FIREBASE_AUTH_APP_ID,adminUids:env.CLIPZONE_ADMIN_UIDS.split(',').map(value=>value.trim()).filter(Boolean),
  twitchClientId:env.TWITCH_CLIENT_ID,twitchClientSecret:env.TWITCH_CLIENT_SECRET,youtubeApiKey:env.YOUTUBE_API_KEY}
 // Private memory only. Compare bindings to invalidate caches on secret rotation,
 // including when a local host reuses and mutates the same env object.
 const signature=JSON.stringify(config),cached=applications.get(env)
 if(cached?.signature===signature)return cached.app
 const app=createCloudflareApplication(config,{assets:request=>env.ASSETS.fetch(request),fetcher:(input,init)=>fetch(input,init),now:()=>new Date()})
 applications.set(env,{signature,app});return app
}
/** Prepared entry only. No manifest, bindings, cron, resources or deploy enabled. */
export default {
 async fetch(request:Request,env:Environment):Promise<Response>{
  try{
   const url=new URL(request.url),api=url.pathname==='/api'||url.pathname.startsWith('/api/')
   if(!api){if(url.origin!==env.CLIPZONE_ORIGIN)return Response.json({error:'invalid-origin'},{status:403});return url.pathname.startsWith('/images/games/')?serveStaticGameCover(request,r=>env.ASSETS.fetch(r)):env.ASSETS.fetch(request)}
   return await application(env)(request)
  }catch{return Response.json({error:'service-unavailable'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
 },
 async scheduled(_event:unknown,env:Environment){
  if(env.CLIPZONE_JOBS_ENABLED!=='true')return {status:'disabled'}
  try{const result=await application(env).maintenance();console.info('clipzone-maintenance',JSON.stringify(result));return result}catch{console.warn('clipzone-maintenance: configuration-unavailable');return {status:'deferred',reason:'configuration-unavailable'}}
 },
}
