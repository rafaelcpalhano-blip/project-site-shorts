import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import {request} from 'node:https'
import type {RequestOptions} from 'node:https'
import {externalGameCoverUrl} from '../../src/lib/validation/external-game-cover.ts'
export const coverLimits={bytes:500*1024,dimension:2048,redirects:3,timeoutMs:15000} as const
export interface CoverAddress {address:string;family:number}
interface RemoteCover {status:number;location?:string;type?:string;body:Buffer}
export function isPublicCoverAddress(address:string):boolean {
 if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===0||b===168||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113)}
 if(isIP(address)!==6)return false
 const host=new URL('https://['+address+']/').hostname.slice(1,-1),parts=host.split(':'),first=parseInt(parts[0],16),second=parseInt(parts[1]||'0',16)
 return first>=0x2000&&first<0x4000&&first!==0x2002&&!(first===0x2001&&(second<0x200||second===0xdb8))&&!(first===0x3fff&&second<0x1000)
}
/** Pin the approved IP to the TLS connection. Never use a proxy, cookies, credentials or automatic redirects. */
export function readPinnedCover(url:URL,address:CoverAddress,signal:AbortSignal,requester:typeof request=request):Promise<RemoteCover>{
 return new Promise((resolve,reject)=>{
  const settings:RequestOptions & {autoSelectFamily:boolean}={method:'GET',agent:false,autoSelectFamily:false,family:address.family,servername:url.hostname,rejectUnauthorized:true,maxHeaderSize:8192,signal,
   lookup:(_host,_options,callback)=>callback(null,address.address,address.family),headers:{Accept:'image/png,image/jpeg,image/webp','Accept-Encoding':'identity'}}
  const req=requester(url,settings,response=>{
    const status=response.statusCode??0
    if([301,302,303,307,308].includes(status)){resolve({status,location:response.headers.location,body:Buffer.alloc(0)});response.destroy();return}
    const type=response.headers['content-type']?.split(';')[0].trim().toLowerCase(),encoding=response.headers['content-encoding'],length=response.headers['content-length']
    if(status!==200||!['image/png','image/jpeg','image/webp'].includes(type??'')||encoding&&encoding!=='identity'||length!==undefined&&(!/^\d+$/.test(length)||Number(length)>coverLimits.bytes)){
     reject(Error('invalid-cover'));response.destroy();return
    }
    const chunks:Buffer[]=[];let size=0
    response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>coverLimits.bytes){reject(Error('invalid-cover'));response.destroy()}else chunks.push(chunk)})
    response.on('error',reject);response.on('aborted',()=>reject(Error('invalid-cover')))
    response.on('end',()=>{if(length!==undefined&&size!==Number(length)){reject(Error('invalid-cover'));return}resolve({status,type,body:Buffer.concat(chunks)})})
   })
  req.on('error',reject);req.end()
 })
}
/** Checks format headers and dimensions, not a full image decode; the browser still handles load failures. */
export function coverDimensions(body:Buffer,type:string):{width:number;height:number}|undefined{
 if(body.length>coverLimits.bytes)return
 let width=0,height=0
 if(type==='image/png'&&body.length>=33&&body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&body.readUInt32BE(8)===13&&body.toString('ascii',12,16)==='IHDR'){width=body.readUInt32BE(16);height=body.readUInt32BE(20)}
 else if(type==='image/webp'&&body.length>=30&&body.toString('ascii',0,4)==='RIFF'&&body.toString('ascii',8,12)==='WEBP'&&body.readUInt32LE(4)+8===body.length){
  const kind=body.toString('ascii',12,16)
  if(kind==='VP8X'){width=body.readUIntLE(24,3)+1;height=body.readUIntLE(27,3)+1}
  else if(kind==='VP8 '&&body.subarray(23,26).equals(Buffer.from([157,1,42]))){width=body.readUInt16LE(26)&0x3fff;height=body.readUInt16LE(28)&0x3fff}
  else if(kind==='VP8L'&&body[20]===47){const bits=body.readUInt32LE(21);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1}
 }
 else if(type==='image/jpeg'&&body.length>=4&&body.readUInt16BE(0)===0xffd8&&body.readUInt16BE(body.length-2)===0xffd9){
  let offset=2
  while(offset+4<=body.length){if(body[offset++]!==255)return;while(body[offset]===255)offset++;const marker=body[offset++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;if(offset+2>body.length)return;const length=body.readUInt16BE(offset);if(length<2||offset+length>body.length)return
   if([0xc0,0xc1,0xc2].includes(marker)&&length>=8){height=body.readUInt16BE(offset+3);width=body.readUInt16BE(offset+5);break}offset+=length
  }
 }
 return width>0&&height>0&&width<=coverLimits.dimension&&height<=coverLimits.dimension?{width,height}:undefined
}
export function createRemoteCoverInspector(options:{resolve?:(host:string)=>Promise<CoverAddress[]>;read?:(url:URL,address:CoverAddress,signal:AbortSignal)=>Promise<RemoteCover>;timeoutMs?:number}={}){
 const resolve=options.resolve??(host=>lookup(host,{all:true,verbatim:true})),read=options.read??readPinnedCover
 return async(value:string):Promise<string>=>{
  const signal=AbortSignal.timeout(options.timeoutMs??coverLimits.timeoutMs)
  let current=value
  for(let redirects=0;redirects<=coverLimits.redirects;redirects++){
   const canonical=externalGameCoverUrl(current);if(!canonical)throw Error('invalid-cover')
   const url=new URL(canonical)
   let abort:()=>void=()=>{}
   const addresses=await Promise.race([resolve(url.hostname),new Promise<never>((_accept,reject)=>{abort=()=>reject(Error('invalid-cover'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()})]).finally(()=>signal.removeEventListener('abort',abort))
   signal.throwIfAborted()
   if(!addresses.length||addresses.length>32||addresses.some(item=>!isPublicCoverAddress(item.address)||isIP(item.address)!==item.family))throw Error('invalid-cover')
   const result=await read(url,addresses.find(item=>item.family===4)??addresses[0],signal)
   signal.throwIfAborted()
   if([301,302,303,307,308].includes(result.status)){if(!result.location||redirects===coverLimits.redirects)throw Error('invalid-cover');current=new URL(result.location,url).href;continue}
   if(result.status!==200||!coverDimensions(result.body,result.type??''))throw Error('invalid-cover')
   return canonical
  }
  throw Error('invalid-cover')
 }
}
export const inspectRemoteCover=createRemoteCoverInspector()
