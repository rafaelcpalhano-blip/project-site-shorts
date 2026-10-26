const unavailable=()=>new Error('server-credential-unavailable')
/** Secret is supplied by trusted server composition, never loaded from a file or HTTP. */
export function createServiceKeySigner(pem:string){
 if(typeof pem!=='string'||pem.length>16384||!/^-----BEGIN PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PRIVATE KEY-----\r?\n?$/.test(pem))throw unavailable()
 const encoded=pem.replace(/-----[^\r\n]+-----/g,'').replace(/\s/g,'')
 if(!/^(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw unavailable()
 let key:Promise<CryptoKey>|undefined
 return async(content:Uint8Array):Promise<Uint8Array>=>{
  try{
   if(!(content instanceof Uint8Array)||content.byteLength>16384)throw unavailable()
   key??=(async()=>{
    const bytes=Buffer.from(encoded,'base64')
    if(bytes.toString('base64')!==encoded)throw unavailable()
    const imported=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign'])
    const algorithm=imported.algorithm as RsaHashedKeyAlgorithm
    if(algorithm.modulusLength<2048||algorithm.modulusLength>4096||algorithm.hash.name!=='SHA-256')throw unavailable()
    return imported
   })()
   return new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',await key,new Uint8Array(content)))
  }catch{key=undefined;throw unavailable()}
 }
}
