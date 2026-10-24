import {parseVideoUrl} from './video-url.ts'
/** Only official short-link shapes; no arbitrary redirect destinations. */
export function sharedVideoInput(value:string) {
 const url=new URL(value.trim())
 if(url.protocol!=='https:'||url.username||url.password||url.port||value.length>2048)throw Error('Use um link HTTPS oficial válido.')
 const short=(['vt.tiktok.com','vm.tiktok.com'].includes(url.hostname)&&/^\/[A-Za-z0-9_-]{3,128}\/?$/.test(url.pathname))||(['www.tiktok.com','tiktok.com'].includes(url.hostname)&&/^\/t\/[A-Za-z0-9_-]{3,128}\/?$/.test(url.pathname))
 if(short)return {url:url.href,platform:'TikTok',short:true}
 const video=parseVideoUrl(value)
 return {url:value.trim(),platform:video.platform,short:false}
}
/** Clean a single supported URL; leave ambiguous/invalid text for explicit validation. */
export function extractSharedVideoUrl(value:string):string {
 if(value.length>8192)return value
 const matches=value.match(/https?:\/\/[^\s<>"“”]+/gi)
 if(matches?.length!==1)return value
 const candidate=matches[0].replace(/[),.;!\]}>]+$/g,'')
 try{sharedVideoInput(candidate);return candidate}catch{return value}
}
