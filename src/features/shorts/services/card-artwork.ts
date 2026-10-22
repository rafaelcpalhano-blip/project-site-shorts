import { validThumbnail } from '../../../lib/validation/thumbnail.ts'
import { gameCoverUrl } from '../../../lib/validation/game-cover.ts'
import type { Short } from '../types/models.ts'
export function createImageFailureCache(limit=256) {
  const failures=new Set<string>()
  return { has:(url:string)=>failures.has(url), add(url:string) { failures.add(url); if(failures.size>limit)failures.delete(failures.values().next().value!) } }
}
export const failedCardImages=createImageFailureCache()
export function cardArtwork(short:Short,now:number,failed:(url:string)=>boolean) {
  const thumbnail=validThumbnail(short.thumbnail,short.platform,short.identity,now)
  if(thumbnail&&!failed(thumbnail.url))return {kind:'thumbnail' as const,url:thumbnail.url}
  const cover=gameCoverUrl(short.gameCoverUrl)
  if(cover&&!failed(cover))return {kind:'cover' as const,url:cover}
  return {kind:'clipper' as const,url:'/clipper/image-unavailable.png'}
}
