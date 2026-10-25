import {cloudflareDirectTransport} from '../../server/runtime/cloudflare-direct-transport.ts'
import {createWorkerEntry} from '../../server/runtime/worker-entry.ts'
const ensure=(ok:unknown)=>{if(!ok)throw Error('free-ingress-proof-failed')}
const origin='https://clipzone.test'
function edge(headers:Record<string,string>={},metadata:unknown={colo:'GRU',httpProtocol:'HTTP/2'}){
 const request=new Request(origin+'/api/probe',{headers:{'CF-Connecting-IP':'8.8.8.8',...headers}})
 if(metadata!==null)Object.defineProperty(request,'cf',{value:metadata}) // synthetic metadata; never an HTTP claim
 return request
}
export const freeIngressCases=[
 {name:'headers alone cannot establish Cloudflare transport outside edge entry',run:async()=>ensure(cloudflareDirectTransport(edge({'X-Forwarded-For':'1.1.1.1'},null))===undefined)},
 {name:'direct platform metadata uses CF address and ignores spoofed forwarding chain',run:async()=>ensure(cloudflareDirectTransport(edge({'X-Forwarded-For':'1.1.1.1','X-Real-IP':'9.9.9.9'}))?.clientAddress==='8.8.8.8')},
 {name:'IPv6 is passed to existing downstream network grouping',run:async()=>ensure(cloudflareDirectTransport(edge({'CF-Connecting-IP':'2001:4860:4860::8888'}))?.clientAddress==='2001:4860:4860::8888')},
 {name:'Worker subrequests and shared cross-zone address are refused',run:async()=>{for(const headers of [{'CF-Worker':'other.org'},{'CF-Worker':'clipzone.test'},{'CF-Connecting-IP':'2a06:98c0:3600:0:0:0:0:103'}] as Array<Record<string,string>>)ensure(cloudflareDirectTransport(edge(headers))===undefined)}},
 {name:'invalid, multiple, zoned and pseudo IPv4 addresses fail closed',run:async()=>{for(const address of ['', '8.8.8.8, 1.1.1.1','fe80::1%eth0','240.0.0.1','garbage'])ensure(cloudflareDirectTransport(edge({'CF-Connecting-IP':address}))===undefined);ensure(cloudflareDirectTransport(edge({},{}))===undefined)}},
 {name:'entry refuses missing transport before API creation and preserves origin checks',run:async()=>{let calls=0;const entry=createWorkerEntry({origin,assets:async()=>new Response('asset'),trustedTransport:cloudflareDirectTransport,createApi:async()=>{calls++;return async()=>Response.json({ok:true})}});ensure((await entry(edge({},null))).status===503&&calls===0);ensure((await entry(edge({Origin:'https://evil.test'}))).status===403&&calls===0);ensure((await entry(edge())).status===200&&calls===1)}},
]
