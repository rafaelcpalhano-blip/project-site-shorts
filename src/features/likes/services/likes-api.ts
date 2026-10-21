import { publicId } from '../../../lib/validation/public-read.ts'
export interface LikeState {shortId:string;liked:boolean;revision:number;count:number}
export function createLikesClient(fetcher:typeof fetch=fetch){
 async function call(shortId:string,state?:LikeState,liked?:boolean,signal?:AbortSignal):Promise<LikeState>{
  publicId(shortId)
  const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)
  const post=(path:string,input:unknown)=>fetcher(path,{method:'POST',credentials:'same-origin',redirect:'error',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})
  const session=await post('/api/session',{})
  if(!session.ok)throw new Error('Não foi possível iniciar a sessão. Aguarde e atualize a curtida.')
  const response=await post(state?'/api/likes/set':'/api/likes/state',state?{shortId,liked,revision:state.revision}:{shortId}),data=await response.json()
  if(!response.ok)throw new Error(response.status===409?'A curtida mudou em outra solicitação. Atualize antes de tentar novamente.':response.status===429?'Muitas tentativas. Aguarde antes de atualizar a curtida.':response.status===404?'Este short não está disponível para curtidas.':'Não foi possível confirmar a curtida. Atualize para conferir o estado antes de tentar novamente.')
  if(!data||data.shortId!==shortId||typeof data.liked!=='boolean'||!Number.isSafeInteger(data.count)||data.count<0||data.liked&&data.count===0||!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('Resposta de curtida inválida. Atualize antes de tentar novamente.')
  return {shortId:data.shortId,liked:data.liked,count:data.count,revision:data.revision}
 }
 return {state:(shortId:string,signal?:AbortSignal)=>call(shortId,undefined,undefined,signal),set:(state:LikeState,liked:boolean)=>call(state.shortId,state,liked)}
}
