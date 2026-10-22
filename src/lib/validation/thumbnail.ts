export interface Thumbnail {url:string;obtainedAt:number;expiresAt:number}
export const thumbnailLifetimeMs=7*86400000
// Only metadata from a verified provider may populate this optional field.
export function thumbnailUrl(value:unknown,platform:string,identity:string):string|undefined {
 if(typeof value!=='string'||value.length>4096||[...value].some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127)||!identity.startsWith(platform+':'))return
 try{
  const url=new URL(value),host=url.hostname
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return
  if(platform==='YouTube'){
   if(!['i.ytimg.com','img.youtube.com'].includes(host))return
   const parts=url.pathname.split('/')
   if(!['vi','vi_webp'].includes(parts[1])||parts[2]!==identity.slice(8)||parts.length!==4||!/^[-\w]+\.(jpg|webp)$/.test(parts[3]))return
  }else if(platform==='Twitch'){
   if(!['clips-media-assets.twitch.tv','clips-media-assets2.twitch.tv','static-cdn.jtvnw.net'].includes(host))return
  }else if(platform==='TikTok'){
   if(!['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','muscdn.com'].some(domain=>host===domain||host.endsWith('.'+domain)))return
  }else return
  return url.href
 }catch{return}
}
export function validThumbnail(value:unknown,platform:string,identity:string,now=Date.now()):Thumbnail|undefined {
 if(!Number.isSafeInteger(now)||now<0||!value||typeof value!=='object'||Array.isArray(value))return
 const data=value as Record<string,unknown>,url=thumbnailUrl(data.url,platform,identity)
 if(!url||!Number.isSafeInteger(data.obtainedAt)||!Number.isSafeInteger(data.expiresAt)||Number(data.obtainedAt)<0||Number(data.obtainedAt)>now+1000||Number(data.expiresAt)<=now||Number(data.expiresAt)<=Number(data.obtainedAt)||Number(data.expiresAt)-Number(data.obtainedAt)>thumbnailLifetimeMs)return
 return {url,obtainedAt:Number(data.obtainedAt),expiresAt:Number(data.expiresAt)}
}
