import type {OrderedCursor} from './read-feed.ts'
export class RankingRequestError extends Error {readonly status:number;constructor(code:string,status=400){super(code);this.status=status}}
export async function createRankingCursor(secret:string,origin:string){
 if(!/^[a-f0-9]{64}$/i.test(secret)||new URL(origin).protocol!=='https:')throw Error('ranking-invalid-signing-config')
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,s=>parseInt(s,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']),encoder=new TextEncoder()
 return {
  async seal(cursor:OrderedCursor){const payload=Buffer.from(JSON.stringify({origin,cursor})).toString('base64url'),signature=await crypto.subtle.sign('HMAC',key,encoder.encode('ranking-cursor:v1:'+payload));return 'v1.'+payload+'.'+Buffer.from(signature).toString('hex')},
  async open(value:unknown):Promise<OrderedCursor>{
   if(typeof value!=='string'||value.length>4096)throw new RankingRequestError('invalid-ranking-cursor')
   const match=/^v1\.([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/.exec(value)
   if(!match||!await crypto.subtle.verify('HMAC',key,Buffer.from(match[2],'hex'),encoder.encode('ranking-cursor:v1:'+match[1])))throw new RankingRequestError('invalid-ranking-cursor')
   try{const data=JSON.parse(Buffer.from(match[1],'base64url').toString('utf8'));if(data.origin!==origin||!data.cursor||typeof data.cursor!=='object'||Array.isArray(data.cursor))throw Error();return data.cursor}catch{throw new RankingRequestError('invalid-ranking-cursor')}
  }
 }
}
