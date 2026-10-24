import {sharedVideoInput} from '../../src/lib/validation/shared-video-url.ts'
import {parseVideoUrl} from '../../src/lib/validation/video-url.ts'
/** Manual redirects, fixed official hosts, four requests and one total time budget. */
export async function resolveSharedVideoUrl(value:string,fetcher:typeof fetch=fetch):Promise<string> {
 let current=sharedVideoInput(value)
 if(!current.short)return parseVideoUrl(current.url).url
 const signal=AbortSignal.timeout(6000)
 for(let hop=0;hop<4;hop++){
  const response=await fetcher(current.url,{redirect:'manual',credentials:'omit',signal})
  const location=response.headers.get('location');await response.body?.cancel()
  if(![301,302,303,307,308].includes(response.status)||!location)throw Error('short-link-unavailable')
  const target=new URL(location,current.url)
  // Validate before any further request, never follow login/profile/external destinations.
  const next=sharedVideoInput(target.href)
  if(next.platform!=='TikTok')throw Error('invalid-short-link-target')
  if(!next.short)return parseVideoUrl(next.url).url
  current=next
 }
 throw Error('short-link-redirect-limit')
}
