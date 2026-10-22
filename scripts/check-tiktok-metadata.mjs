// Read-only, at most three canonical public URLs. No HTML execution, playback or database writes.
import {parseVideoUrl} from '../src/lib/validation/video-url.ts'
import {thumbnailUrl} from '../src/lib/validation/thumbnail.ts'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
const args=process.argv.slice(2)
if(args.length<1||args.length>3)throw Error('Informe de um a três links completos TikTok /@usuario/video/ID.')
const urls=[...new Set(args.map(value=>{const video=parseVideoUrl(value);if(video.platform!=='TikTok')throw Error('Somente URLs TikTok canônicas');return video.url}))]
for(const url of urls){
 const endpoint=new URL('https://www.tiktok.com/oembed');endpoint.searchParams.set('url',url)
 try{
  const response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(10000)}),snapshot=response.clone()
  const evidence=await createTikTokVerifier(async()=>snapshot)({url}),data=await response.json(),identity='TikTok:'+url.split('/').at(-1),image=thumbnailUrl(data?.thumbnail_url,'TikTok',identity)
  console.log(JSON.stringify({url,status:response.status,embedType:typeof data?.embed_type==='string'?data.embed_type.slice(0,40):null,htmlKind:typeof data?.html==='string'?(data.html.trimStart().startsWith('<iframe')?'iframe':data.html.includes('<blockquote')?'blockquote':'other'):null,identityConfirmed:evidence.existence==='confirmed',textFields:Object.fromEntries(['title','description','caption'].map(field=>[field,{present:typeof data?.[field]==='string',length:typeof data?.[field]==='string'?data[field].length:null}])),titlePresent:typeof data?.title==='string',titleLength:typeof data?.title==='string'?data.title.length:null,titleUsable:!!evidence.title,thumbnailPresent:typeof data?.thumbnail_url==='string',thumbnailAllowed:!!image,...(image?{thumbnailHost:new URL(image).hostname}:{})}))
 }catch{console.log(JSON.stringify({url,error:'Consulta oficial indisponível ou resposta sem JSON'}));process.exitCode=1}
}
