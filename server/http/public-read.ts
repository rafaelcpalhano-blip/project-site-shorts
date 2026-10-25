import {readGames,readGame} from '../public/read-games.ts'
import {orderedFeed} from './ordered-feed.ts'
import type {RankingCursorCodec} from './ordered-feed.ts'
import {RankingRequestError} from '../ranking/cursor.ts'
import { readFeed, readComments, readPublicShort, PublicReadError } from '../public/read-content.ts'
import { BodyError, readInput } from './submissions.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
export async function handlePublicRead(request: Request, options: {origin:string;store:AtomicStore;resolveVisitor:(request:Request)=>Promise<string|null>;checkAbuse:(visitor:string)=>Promise<void>;ordered?:{cursor:RankingCursorCodec;now:()=>Date}}) {
 const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(status===405?{Allow:'POST'}:{})}})
 if(request.method!=='POST')return reply(405,{error:'method-not-allowed'})
 if(request.headers.get('origin')!==options.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'invalid-origin'})
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||request.headers.has('content-encoding'))return reply(415,{error:'unsupported-media-type'})
 try {
  const visitor=await options.resolveVisitor(request)
  if(!visitor||!/^[a-f0-9]{64}$/.test(visitor))return reply(401,{error:'invalid-session'})
  await options.checkAbuse(visitor)
  const input=await readInput(request),path=new URL(request.url).pathname
  if(path==='/api/feed/ordered'){if(!options.ordered)return reply(503,{error:'ranking-not-ready'});return reply(200,await orderedFeed(input,options.store,options.ordered))}
  if(path==='/api/games/list')return reply(200,await readGames(input,options.store))
  if(path==='/api/games/detail')return reply(200,await readGame(input,options.store))
  if(path==='/api/feed')return reply(200,await readFeed(input,options.store))
  if(path==='/api/shorts/detail')return reply(200,await readPublicShort(input,options.store))
  if(path==='/api/comments/list')return reply(200,await readComments(input,options.store))
  return reply(404,{error:'not-found'})
 } catch(error) {
  if(error instanceof RankingRequestError)return reply(error.status,{error:error.message})
  if(error instanceof BodyError)return reply(error.status,{error:'invalid-body'})
  if(error instanceof PublicReadError)return reply(error.status,{error:error.message})
  if(error instanceof SubmissionError&&error.code==='abuse-limit')return reply(429,{error:'abuse-limit'})
  return reply(503,{error:'unavailable'})
 }
}
