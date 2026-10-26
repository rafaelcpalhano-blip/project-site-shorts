import {isIP} from 'node:net'
import {runWorkerMaintenance} from './worker-maintenance.ts'
import {createWorkerFetch} from './worker-fetch.ts'
import {createOutboundBudget} from './outbound-budget.ts'
import {createServiceKeySigner} from '../auth/service-key.ts'
import {createServiceTokenProvider} from '../auth/service-token.ts'
import {createAdminAuthorizer} from '../auth/firebase-admin.ts'
import {createRestStore} from '../firestore/rest-store.ts'
import {createPublicApi} from '../http/public-api.ts'
import {createIgdbCatalog} from '../games/igdb.ts'
import {createConfiguredVideoVerifier} from '../videos/configured.ts'
import {createTwitchClipVerifier} from '../videos/twitch.ts'
import {cloudflareDirectTransport} from './cloudflare-direct-transport.ts'
import {createWorkerEntry} from './worker-entry.ts'

export interface CloudflareApplicationConfiguration {
 origin:string;projectId:string;authProjectId:string
 serviceEmail:string;servicePrivateKey:string
 visitorSecret:string;networkSecret:string
 authApiKey:string;authAppId:string;adminUids:string[]
 twitchClientId:string;twitchClientSecret:string;youtubeApiKey:string
}
/** Opt-in server composition. No bindings, default target, environment loading or deployment. */
export function createCloudflareApplication(config:CloudflareApplicationConfiguration,ports:{assets:(request:Request)=>Promise<Response>;fetcher:typeof fetch;now:()=>Date}){
 try{
  const origin=new URL(config.origin)
  if(origin.protocol!=='https:'||origin.origin!==config.origin||!origin.hostname.includes('.')||!!isIP(origin.hostname.replace(/^\[|\]$/g,''))||origin.hostname.endsWith('.localhost')||origin.hostname.endsWith('.test')||/^(?:localhost|127\.|\[|0\.)/.test(origin.hostname)||
   config.projectId!=='clipzone-db02a'||config.authProjectId!==config.projectId||!/^1:818748049569:web:[a-f0-9]+$/.test(config.authAppId)||
   !/^[a-f0-9]{64}$/i.test(config.visitorSecret)||!/^[a-f0-9]{64}$/i.test(config.networkSecret)||config.visitorSecret.toLowerCase()===config.networkSecret.toLowerCase()||
   !config.authApiKey||!config.youtubeApiKey||!config.twitchClientId||!config.twitchClientSecret||!config.adminUids.length||config.adminUids.some(uid=>!uid||uid.length>128||/\s/.test(uid))||
   typeof ports.fetcher!=='function'||typeof ports.assets!=='function'||typeof ports.now!=='function')throw Error('invalid')
  const configSnapshot={...config,adminUids:[...config.adminUids]}
  const credentials=createServiceTokenProvider({projectId:configSnapshot.projectId,clientEmail:configSnapshot.serviceEmail,sign:createServiceKeySigner(configSnapshot.servicePrivateKey),now:ports.now})
  const entry=createWorkerEntry({origin:configSnapshot.origin,assets:ports.assets,trustedTransport:cloudflareDirectTransport,fetcher:ports.fetcher,
   createApi:async({origin,budget})=>{
    // Nothing here captures a previous request's budget in shared state.
    const store=createRestStore({projectId:configSnapshot.projectId,accessToken:credentials(budget.fetch),fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
    const catalog=createIgdbCatalog({clientId:configSnapshot.twitchClientId,clientSecret:configSnapshot.twitchClientSecret},budget.fetch)
    const twitch=createTwitchClipVerifier({clientId:configSnapshot.twitchClientId,accessToken:catalog.accessToken,fetcher:budget.fetch})
    const verify=createConfiguredVideoVerifier({twitch,youtubeApiKey:configSnapshot.youtubeApiKey,fetcher:budget.fetch})
    return createPublicApi({origin,store,visitorSecret:configSnapshot.visitorSecret,network:{secret:configSnapshot.networkSecret},now:ports.now,
     verify,previewFetch:budget.fetch,maximumAttempts:20,attemptWindowMs:60000,
     // Persistent network session admission is mandatory above; no isolate-local substitute.
     allowSessionIssuance:async()=>true,
     gameSearch:{...catalog,maximumAttempts:20,windowMs:60000},
     admin:{publicConfig:{projectId:configSnapshot.authProjectId,authDomain:configSnapshot.authProjectId+'.firebaseapp.com',apiKey:configSnapshot.authApiKey,appId:configSnapshot.authAppId},
      authorize:createAdminAuthorizer({projectId:configSnapshot.authProjectId,apiKey:configSnapshot.authApiKey,allowedUids:configSnapshot.adminUids,now:ports.now,fetcher:budget.fetch})},
    })
   },
  })
  return Object.assign(entry,{maintenance:async()=>{
   const budget=createOutboundBudget({maximum:48,cleanupReserve:1,fetcher:createWorkerFetch(ports.fetcher)})
   const store=createRestStore({projectId:configSnapshot.projectId,accessToken:credentials(budget.fetch),fetcher:budget.fetch,cleanupFetcher:budget.cleanupFetch})
   try{return {...await runWorkerMaintenance({store,now:ports.now}),outbound:budget.usage().dispatched}}
   catch(error){const message=error instanceof Error?error.message:'';const reason=['outbound-budget-exhausted','ranking-budget-exhausted','ranking-build-busy','ranking-metrics-not-ready','ranking-generation-protected','ranking-build-expired'].includes(message)?message:'service-unavailable';return {task:'maintenance',status:'deferred',reason,outbound:budget.usage().dispatched}}
  }})
 }catch{throw Error('worker-configuration-unavailable')}
}
