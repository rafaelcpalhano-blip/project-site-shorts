export type PlaybackSignal='manual'|'timeout'|'network'|'youtube-2'|'youtube-5'|'youtube-100'|'youtube-101'|'youtube-150'|'youtube-153'|'tiktok-error'
export function createPlaybackFailureClient(fetcher:typeof fetch=fetch){
 const entries=new Map<string,{until:number;pending:Promise<boolean>}>()
 return (shortId:string,signal:PlaybackSignal):Promise<boolean>=>{
  const tier=['manual','youtube-100','youtube-101','youtube-150','tiktok-error'].includes(signal)?'eligible':'context',key=shortId+':'+tier,previous=entries.get(key)
  if(previous&&previous.until>Date.now())return previous.pending
  if(entries.size>=128)entries.delete(entries.keys().next().value!)
  const pending=(async()=>{try{
   const session=await fetcher('/api/session',{method:'POST',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)})
   if(!session.ok)return false
   const response=await fetcher('/api/playback/failure',{method:'POST',credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({shortId,signal}),signal:AbortSignal.timeout(15000)})
   if(!response.ok)return false
   const result=await response.json();return result?.received===true&&typeof result.counted==='boolean'
  }catch{return false}})()
  entries.set(key,{until:Date.now()+30*86400000,pending})
  void pending.then(received=>{if(!received&&entries.get(key)?.pending===pending)entries.delete(key)})
  return pending
 }
}
export const reportPlaybackFailure=createPlaybackFailureClient()
