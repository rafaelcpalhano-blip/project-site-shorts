// Opt-in OAuth contract. No credential loading, default transport or app activation.
const endpoint='https://oauth2.googleapis.com/token',scope='https://www.googleapis.com/auth/datastore'
const unavailable=()=>new Error('server-credential-unavailable')
interface Options {
 projectId:string;clientEmail:string
 // Production signer/secret custody remains a separate reviewed composition.
 sign:(content:Uint8Array)=>Promise<Uint8Array>
 exchange:typeof fetch
 now:()=>Date
}
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
export function createServiceTokenSupplier(options:Options){
 if(/[\s\p{C}]/u.test(options.projectId+options.clientEmail)||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(options.projectId)||!new RegExp('^[a-z][a-z0-9-]{4,28}[a-z0-9]@'+options.projectId.replaceAll('-','\\-')+'\\.iam\\.gserviceaccount\\.com$').test(options.clientEmail)||typeof options.sign!=='function'||typeof options.exchange!=='function'||typeof options.now!=='function')throw unavailable()
 let cached:{token:string;issuedAt:number;expiresAt:number}|undefined,pending:Promise<string>|undefined
 const clock=()=>{const value=options.now().getTime();if(!Number.isSafeInteger(value)||value<0)throw unavailable();return value}
 return async():Promise<string>=>{
  const started=clock()
  if(cached&&started<cached.issuedAt){cached=undefined;throw unavailable()}
  if(cached&&started<cached.expiresAt-60000)return cached.token
  if(pending)return pending
  cached=undefined
  pending=(async()=>{
   try{
    const issued=Math.floor(started/1000),content=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:options.clientEmail,scope,aud:endpoint,iat:issued,exp:issued+3600})
    const signature=await options.sign(new TextEncoder().encode(content))
    if(!(signature instanceof Uint8Array)||signature.byteLength<256||signature.byteLength>1024)throw unavailable()
    const assertion=content+'.'+Buffer.from(signature).toString('base64url')
    const response=await options.exchange(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()})
    if(!response.ok){await response.body?.cancel();throw unavailable()}
    const reader=response.body?.getReader();if(!reader)throw unavailable()
    const chunks:Uint8Array[]=[];let bytes=0
    try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>24576)throw unavailable();chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
    const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength}
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined)),finished=clock()
    if(finished<started||typeof data.access_token!=='string'||data.access_token.length>16384||/[\s\p{C}]/u.test(data.access_token)||! /^[a-zA-Z0-9._~+/-]+={0,2}$/.test(data.access_token)||data.token_type!=='Bearer'||!Number.isSafeInteger(data.expires_in)||data.expires_in<=60||data.expires_in>3600||started+data.expires_in*1000-60000<=finished)throw unavailable()
    cached={token:data.access_token,issuedAt:started,expiresAt:started+data.expires_in*1000};return cached.token
   }catch{throw unavailable()}
  })()
  try{return await pending}finally{pending=undefined}
 }
}
