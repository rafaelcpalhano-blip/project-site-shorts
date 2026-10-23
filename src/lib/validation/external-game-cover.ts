/** URL syntax only. DNS, redirects and image bytes are checked on the server before saving. */
export function externalGameCoverUrl(value: unknown): string | undefined {
 if(typeof value!=='string'||value.length>2048||/[\s\p{C}<>\\]/u.test(value))return
 try{
  const url=new URL(value),host=url.hostname.toLowerCase()
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||host.length>253||!host.includes('.')||!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return
  if(!/^[a-z][a-z0-9-]*$/.test(host.split('.').at(-1)!)||/(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host))return
  if(/\.(?:svg|html?|js|pdf)$/i.test(url.pathname))return
  return url.href
 }catch{return}
}
