export interface SessionUser {uid:string;getIdTokenResult:()=>Promise<{token:string;expirationTime:string}>}
export interface AdminSessionState<U> {user:U|null;authorized:boolean;checking:boolean;error:string}
// In-memory presentation state only. Every privileged HTTP operation remains server-authorized.
export function createAdminSession<U extends SessionUser>(check:(token:string)=>Promise<string>,now=Date.now){
 let state:AdminSessionState<U>={user:null,authorized:false,checking:false,error:''},epoch=0,locked=false
 let approvedUntil=0
 let pending:Promise<void>|undefined,timer:ReturnType<typeof setTimeout>|undefined
 const listeners=new Set<()=>void>()
 const publish=(next:AdminSessionState<U>)=>{state=next;for(const listener of listeners)listener()}
 const invalidate=(error='')=>{approvedUntil=0;epoch++;pending=undefined;clearTimeout(timer);timer=undefined;publish({...state,authorized:false,checking:false,error})}
 const session={
  getSnapshot:()=>state,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  invalidate,
  setUser:(user:U|null)=>{invalidate();publish({user:locked?null:user,authorized:false,checking:false,error:''})},
  beginSignIn:()=>{locked=false},
  end:()=>{locked=true;invalidate();publish({user:null,authorized:false,checking:false,error:''})},
  async verify(){
   if(pending)return pending
   if(state.authorized&&approvedUntil>now())return
   if(state.authorized)invalidate('Sessão expirada. Verifique novamente o acesso administrativo.')
   const user=state.user,version=epoch
   if(!user||locked)return
   publish({...state,authorized:false,checking:true,error:''})
   pending=(async()=>{
    try{
     const result=await user.getIdTokenResult(),expires=Date.parse(result.expirationTime)
     if(!Number.isFinite(expires)||expires<=now()||!result.token)throw Error('Sessão expirada. Entre novamente com Google e TOTP.')
     const uid=await check(result.token)
     if(version!==epoch||locked)return
     if(uid!==user.uid||expires<=now())throw Error('A autorização da conta não pôde ser confirmada.')
     approvedUntil=expires
     publish({user,authorized:true,checking:false,error:''})
     timer=setTimeout(()=>{if(version===epoch)invalidate('Sessão expirada. Verifique novamente o acesso administrativo.')},Math.min(expires-now(),3600000))
    }catch(failure){if(version===epoch&&!locked)publish({user,authorized:false,checking:false,error:failure instanceof Error?failure.message:'Não foi possível verificar o acesso.'})}
    finally{if(version===epoch)pending=undefined}
   })()
   return pending
  },
  dispose:()=>{invalidate();listeners.clear()},
 }
 return session
}
