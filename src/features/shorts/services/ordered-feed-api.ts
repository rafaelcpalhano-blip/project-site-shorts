import { validThumbnail } from '../../../lib/validation/thumbnail.ts'
import type {PublicShort} from '../../../lib/firebase/public-read-api'
import {publicId} from '../../../lib/validation/public-read.ts'
export const feedOrderLabels={latest:'Últimos Postados',oldest:'Primeiro Postado',likes:'Mais Curtidos',relevant:'Mais Relevante'} as const
export type FeedOrder=keyof typeof feedOrderLabels
export interface OrderedPage {items:PublicShort[];next:string|null;order:FeedOrder;orderingAt:string;limited:boolean}
export function createOrderedFeedClient(fetcher:typeof fetch=fetch){
 return async(order:FeedOrder,gameId?:string,cursor?:string,signal?:AbortSignal):Promise<OrderedPage>=>{
  if(!Object.hasOwn(feedOrderLabels,order))throw Error('Ordenação inválida.')
  if(gameId!==undefined)publicId(gameId)
  if(cursor!==undefined&&(typeof cursor!=='string'||cursor.length>4096))throw Error('Cursor inválido. Atualize o feed.')
  const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),post=(url:string,body:unknown)=>fetcher(url,{method:'POST',credentials:'same-origin',redirect:'error',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const session=await post('/api/session',{})
  if(!session.ok)throw Error('Não foi possível iniciar a consulta. Aguarde e tente novamente.')
  const response=await post('/api/feed/ordered',{order,...(gameId?{gameId}:{}),...(cursor?{cursor}:{})}),data=await response.json()
  if(!response.ok)throw Error(data?.error==='ranking-not-ready'?'O ranking ainda não está disponível ou precisa de atualização. As outras ordenações continuam disponíveis.':response.status===409||data?.error==='invalid-ranking-cursor'?'A paginação expirou ou mudou. Atualize o feed para reiniciar.':response.status===429?'Muitas consultas. Aguarde antes de tentar novamente.':'Não foi possível carregar esta ordenação.')
  if(!data||data.order!==order||!Array.isArray(data.items)||data.items.length>15||typeof data.orderingAt!=='string'||!Number.isFinite(Date.parse(data.orderingAt))||typeof data.limited!=='boolean'||!Number.isSafeInteger(data.candidatesRead)||data.candidatesRead<0||data.candidatesRead>30||!Number.isSafeInteger(data.candidatesExamined)||data.candidatesExamined<0||data.candidatesExamined>data.candidatesRead||data.next!==null&&(typeof data.next!=='string'||data.next.length>4096||!data.next.startsWith('v1.')))throw Error('Resposta de ordenação inválida.')
  for(const row of data.items){publicId(row?.id);publicId(row?.gameId);if(typeof row.title!=='string'||typeof row.url!=='string'||typeof row.gameName!=='string'||typeof row.identity!=='string'||typeof row.channelName!=='string'||!['YouTube','Twitch','TikTok'].includes(row.platform)||!Number.isSafeInteger(row.createdAt)||row.createdAt<0||!Number.isSafeInteger(row.likeCount)||row.likeCount<0||gameId&&row.gameId!==gameId)throw Error('Resposta de ordenação inválida.')}
  if(new Set(data.items.map((row:PublicShort)=>row.id)).size!==data.items.length)throw Error('Resposta de ordenação inválida.')
  const items=data.items.map((row:PublicShort)=>{const {thumbnail,...rest}=row;const image=validThumbnail(thumbnail,row.platform,row.identity);return {...rest,...(image?{thumbnail:image}:{})}})
  return {items,next:data.next,order:data.order,orderingAt:data.orderingAt,limited:data.limited}
 }
}
