import type {AtomicStore} from '../firestore/atomic-store.ts'
import {readOrderedFeed} from '../ranking/read-feed.ts'
import {RankingRequestError} from '../ranking/cursor.ts'
import type {createRankingCursor} from '../ranking/cursor.ts'
export type RankingCursorCodec=Awaited<ReturnType<typeof createRankingCursor>>
export async function orderedFeed(input:unknown,store:AtomicStore,options:{cursor:RankingCursorCodec;now:()=>Date}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RankingRequestError('invalid-ranking-input')
 const data=input as Record<string,unknown>
 if(Object.keys(data).some(key=>!['order','gameId','cursor'].includes(key))||data.order!==undefined&&!['latest','oldest','likes','relevant'].includes(String(data.order))||data.gameId!==undefined&&(typeof data.gameId!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(data.gameId)))throw new RankingRequestError('invalid-ranking-input')
 const cursor=data.cursor===undefined?undefined:await options.cursor.open(data.cursor)
 try{
  const page=await readOrderedFeed({order:(data.order??'latest') as 'latest'|'oldest'|'likes'|'relevant',gameId:data.gameId as string|undefined,cursor},{store,now:options.now})
  return {...page,next:page.next?await options.cursor.seal(page.next):null}
 }catch(error){
  const code=error instanceof Error?error.message:''
  if(code==='ranking-cursor-expired-or-mismatched')throw new RankingRequestError('ranking-cursor-expired',409)
  if(code==='ranking-not-ready-or-stale')throw new RankingRequestError('ranking-not-ready',503)
  if(code==='ranking-invalid-input')throw new RankingRequestError('invalid-ranking-input')
  throw error
 }
}
