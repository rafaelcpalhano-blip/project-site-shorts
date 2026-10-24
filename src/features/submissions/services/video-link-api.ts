import {sharedVideoInput,extractSharedVideoUrl} from '../../../lib/validation/shared-video-url.ts'
import {parseVideoUrl} from '../../../lib/validation/video-url.ts'
export function createVideoLinkClient(fetcher:typeof fetch=fetch){
 return async(value:string,signal:AbortSignal):Promise<string>=>{
  const input=sharedVideoInput(extractSharedVideoUrl(value))
  if(!input.short)return input.url
  for(const path of ['/api/session','/api/shorts/resolve']){
   const response=await fetcher(path,{method:'POST',credentials:'same-origin',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),headers:{'Content-Type':'application/json'},...(path.endsWith('/resolve')?{body:JSON.stringify({url:input.url})}:{})})
   if(!response.ok)throw Error('Não foi possível resolver o link curto do TikTok. Tente novamente ou copie o link completo do vídeo.')
   if(path.endsWith('/resolve')){
    const data=await response.json(),video=parseVideoUrl(data?.url)
    if(video.platform!=='TikTok')throw Error('Resposta de link inesperada.')
    return video.url
   }
  }
  throw Error('Link indisponível.')
 }
}
