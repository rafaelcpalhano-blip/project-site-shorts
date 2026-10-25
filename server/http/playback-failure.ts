import {BodyError,readInput} from './submissions.ts'
import {SubmissionError} from '../submissions/submit-short.ts'
import type {SubmissionDependencies} from '../submissions/submit-short.ts'
import {recordPlaybackFailure,PlaybackFailureError} from '../playback/record-failure.ts'
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===405?{Allow:'POST'}:{})}})
export async function handlePlaybackFailure(request:Request,deps:{origin:string;store:SubmissionDependencies['store'];now:()=>Date;verify:SubmissionDependencies['verify'];resolveVisitor:(request:Request)=>Promise<string|null>;checkAbuse:(visitor:string)=>Promise<void>}){
 if(request.method!=='POST')return reply(405,{error:'method-not-allowed'})
 if(request.headers.get('origin')!==deps.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'invalid-origin'})
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||request.headers.has('content-encoding'))return reply(415,{error:'unsupported-media-type'})
 try{const visitor=await deps.resolveVisitor(request);if(!visitor)return reply(401,{error:'invalid-session'});await deps.checkAbuse(visitor);return reply(200,await recordPlaybackFailure(await readInput(request),visitor,deps))}
 catch(error){if(error instanceof BodyError)return reply(error.status,{error:'invalid-body'});if(error instanceof PlaybackFailureError)return reply(error.status,{error:error.message});if(error instanceof SubmissionError&&error.code==='abuse-limit')return reply(429,{error:'abuse-limit'});return reply(503,{error:'unavailable'})}
}
