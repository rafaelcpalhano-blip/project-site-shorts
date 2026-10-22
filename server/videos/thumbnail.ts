import {thumbnailUrl,thumbnailLifetimeMs,validThumbnail} from '../../src/lib/validation/thumbnail.ts'
export function createThumbnail(value:unknown,platform:string,identity:string,now:Date){
 const url=thumbnailUrl(value,platform,identity),obtainedAt=now.getTime()
 if(!url||!Number.isSafeInteger(obtainedAt)||obtainedAt<0)return
 let expiresAt=obtainedAt+thumbnailLifetimeMs
 // Signed TikTok URLs can expire sooner than the local freshness window.
 const advertised=new URL(url).searchParams.get('x-expires')
 if(advertised!==null){if(!/^\d{1,12}$/.test(advertised))return;expiresAt=Math.min(expiresAt,Number(advertised)*1000)}
 const result=validThumbnail({url,obtainedAt,expiresAt},platform,identity,obtainedAt)
 return result?{url:result.url,obtainedAt:new Date(result.obtainedAt),expiresAt:new Date(result.expiresAt)}:undefined
}
export function readThumbnail(value:unknown,platform:string,identity:string,now=Date.now()){
 if(!value||typeof value!=='object'||Array.isArray(value))return
 const data=value as Record<string,unknown>
 return validThumbnail({url:data.url,obtainedAt:data.obtainedAt instanceof Date?data.obtainedAt.getTime():NaN,expiresAt:data.expiresAt instanceof Date?data.expiresAt.getTime():NaN},platform,identity,now)
}
