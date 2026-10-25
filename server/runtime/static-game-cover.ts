// Only the published static-cover namespace; other assets keep their SPA behavior.
const pathPattern=/^\/images\/games\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\.(png|jpg|jpeg|webp)$/
const notFound=()=>new Response(null,{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
export async function serveStaticGameCover(request:Request,assets:(request:Request)=>Promise<Response>):Promise<Response>{
 const match=pathPattern.exec(new URL(request.url).pathname)
 if(!match)return notFound()
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
 const response=await assets(request)
 const type=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
 const expected=match[1]==='jpg'||match[1]==='jpeg'?'image/jpeg':'image/'+match[1]
 const conditional=response.status===304&&(request.headers.has('if-none-match')||request.headers.has('if-modified-since'))
 if(!conditional&&(![200,206].includes(response.status)||type!==expected)){
  await response.body?.cancel()
  return notFound()
 }
 const headers=new Headers(response.headers)
 headers.set('X-Content-Type-Options','nosniff')
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers})
}
