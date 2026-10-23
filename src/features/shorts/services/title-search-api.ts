import { PublicReadFailure } from '../../../lib/http/read-failure.ts'
import {normalizeTitle} from '../../../lib/validation/title-search.ts'
import type {TitleSearchCursor} from '../../../lib/validation/title-search.ts'
import type {Short} from '../types/models.ts'
export interface TitleSearchPage {items:Short[];next:TitleSearchCursor|null;limited:boolean;exhausted:boolean;order:'recent';candidatesRead:number;candidatesExamined:number}
export function createTitleSearchClient(fetcher:typeof fetch=fetch) {
 return async(input:{query:string;gameId?:string;cursor?:TitleSearchCursor},signal?:AbortSignal):Promise<TitleSearchPage>=>{
  const deadline=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,deadline]):deadline
  const call=(path:string,body:unknown)=>fetcher(path,{method:'POST',credentials:'same-origin',redirect:'error',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  if(!input.query.trim()||input.query.length>500)throw new Error('Informe um trecho de até 500 caracteres.')
  const session=await call('/api/session',{})
  if(!session.ok)throw new PublicReadFailure('Não foi possível iniciar a pesquisa. Aguarde e tente novamente.', 'session')
  const response=await call('/api/shorts/search',input)
  const data=await response.json()
  if(!response.ok){
   if(data?.error==='search-preparing')throw new PublicReadFailure('A pesquisa está sendo preparada. O feed continua disponível ao limpar a busca.')
   if(response.status===429)throw new PublicReadFailure('Muitas pesquisas. Aguarde antes de tentar novamente.')
   throw new PublicReadFailure('Não foi possível pesquisar. Tente novamente.')
  }
  const safeId=(value:unknown)=>typeof value==='string'&&/^[\w-]{1,128}$/.test(value)
  if(!Array.isArray(data?.items)||data.items.length>15||data.items.some((item:Short)=>!item||!safeId(item.id)||!safeId(item.gameId)||typeof item.title!=='string'||typeof item.url!=='string'||typeof item.identity!=='string'||typeof item.channelName!=='string'||!['YouTube','TikTok','Twitch'].includes(item.platform)||!Number.isFinite(item.createdAt))||
   data.order!=='recent'||typeof data.limited!=='boolean'||typeof data.exhausted!=='boolean'||data.exhausted!==(data.next===null)||
   !Number.isSafeInteger(data.candidatesRead)||data.candidatesRead<0||data.candidatesRead>30||!Number.isSafeInteger(data.candidatesExamined)||data.candidatesExamined<0||data.candidatesExamined>data.candidatesRead||
   data.next!==null&&(!data.next||!safeId(data.next.id)||typeof data.next.time!=='string'||!Number.isFinite(Date.parse(data.next.time))||data.next.query!==normalizeTitle(input.query)||data.next.gameId!==(input.gameId??null)||data.next.order!=='recent'))throw new Error('Resposta de pesquisa inválida.')
  return data as TitleSearchPage
 }
}
