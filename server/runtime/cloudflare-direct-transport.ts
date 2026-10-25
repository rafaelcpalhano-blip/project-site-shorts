import {isIP} from 'node:net'
import type {WorkerTransport} from './worker-entry.ts'
/** For the ORIGINAL Request delivered to a direct Cloudflare fetch entry only.
 * Never mount behind Node/proxy shims, request reconstruction or service bindings.
 * cf is platform metadata, not an assertion to accept from JSON or HTTP headers.
 * This is a direct-ingress policy, not independent cryptographic edge attestation.
 */
export function cloudflareDirectTransport(request:Request):WorkerTransport|undefined{
 const cf=(request as Request&{cf?:{colo?:unknown;httpProtocol?:unknown}}).cf
 if(new URL(request.url).protocol!=='https:'||!cf||typeof cf.colo!=='string'||!/^[A-Z]{3}$/.test(cf.colo)||typeof cf.httpProtocol!=='string'||!/^HTTP\/(?:1\.[01]|2|3)$/.test(cf.httpProtocol))return
 // Reject Worker forwarding, including same-zone scripts able to alter x-real-ip.
 if(request.headers.has('CF-Worker'))return
 const address=request.headers.get('CF-Connecting-IP')
 if(!address||address.length>64||address.includes('%')||!isIP(address))return
 if(isIP(address)===4&&Number(address.split('.')[0])>=240)return // Pseudo IPv4 overwrite is not supported.
 if(isIP(address)===6&&new URL('https://['+address+']/').hostname==='[2a06:98c0:3600::103]')return
 return {clientAddress:address}
}
