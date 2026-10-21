import { searchTitles,SearchError } from '../search/search-titles.ts'
import { BodyError,readInput } from './submissions.ts'
import { SubmissionError } from '../submissions/submit-short.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
export async function handleTitleSearch(request:Request,options:{origin:string;store:AtomicStore;resolveVisitor:(request:Request)=>Promise<string|null>;checkAbuse:(visitor:string)=>Promise<void>}) {
 const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===405?{Allow:'POST'}:{})}})
 if(request.method!=='POST')return reply(405,{error:'method-not-allowed'})
 if(request.headers.get('origin')!==options.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'invalid-origin'})
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||request.headers.has('content-encoding'))return reply(415,{error:'unsupported-media-type'})
 try{
  const visitor=await options.resolveVisitor(request)
  if(!visitor||!/^[a-f0-9]{64}$/.test(visitor))return reply(401,{error:'invalid-session'})
  await options.checkAbuse(visitor)
  return reply(200,await searchTitles(await readInput(request),options.store))
 }catch(error){
  if(error instanceof BodyError)return reply(error.status,{error:'invalid-body'})
  if(error instanceof SearchError)return reply(error.status,{error:error.message})
  if(error instanceof SubmissionError&&error.code==='abuse-limit')return reply(429,{error:'abuse-limit'})
  return reply(503,{error:'unavailable'})
 }
}
