import {parseVideoUrl} from '../../src/lib/validation/video-url.ts'
import {createYouTubeOEmbedVerifier} from './youtube.ts'
import type {SubmissionDependencies} from '../submissions/submit-short.ts'
/** Metadata-only recovery. Never used by publication or moderation verification. */
export function createVideoPreviewVerifier(verify:SubmissionDependencies['verify'],fetcher:typeof fetch=fetch):SubmissionDependencies['verify'] {
 const fallback=createYouTubeOEmbedVerifier((url,options)=>fetcher(url,{...options,signal:AbortSignal.any([...(options?.signal?[options.signal]:[]),AbortSignal.timeout(4000)])}))
 return async submission=>{
  const evidence=await verify(submission)
  if(parseVideoUrl(submission.url).platform!=='YouTube'||evidence.existence==='missing'||evidence.title&&evidence.channelName)return evidence
  const publicMetadata=await fallback(submission)
  if(publicMetadata.existence!=='confirmed'||!publicMetadata.title)return evidence
  return {...evidence,existence:'confirmed',title:evidence.title||publicMetadata.title,channelName:evidence.channelName||publicMetadata.channelName}
 }
}
