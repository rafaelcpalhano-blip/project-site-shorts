import {validateChannelName} from '../../src/lib/validation/public-input.ts'
import {parseVideoUrl} from '../../src/lib/validation/video-url.ts'
/** Optional preview metadata from TikTok's documented creator-profile oEmbed. */
export async function tikTokProfileChannel(url:string,fetcher:typeof fetch=fetch):Promise<string|undefined> {
 try {
  const video=parseVideoUrl(url)
  if(video.platform!=='TikTok')return
  const profile=new URL(video.url);profile.pathname=profile.pathname.split('/').slice(0,2).join('/')
  const endpoint=new URL('https://www.tiktok.com/oembed');endpoint.searchParams.set('url',profile.href)
  const response=await fetcher(endpoint,{redirect:'error',signal:AbortSignal.timeout(4000)})
  if(!response.ok)return
  const result=await response.json()
  if(result?.type!=='rich'||result.version!=='1.0'||result.provider_name!=='TikTok'||!['https://www.tiktok.com','https://www.tiktok.com/'].includes(result.provider_url))return
  const author=new URL(result.author_url)
  if(author.protocol!=='https:'||author.hostname!=='www.tiktok.com'||author.username||author.password||author.port||author.search||author.hash||author.pathname.replace(/\/$/,'')!==profile.pathname)return
  return validateChannelName(result.author_name)||undefined
 } catch { return }
}