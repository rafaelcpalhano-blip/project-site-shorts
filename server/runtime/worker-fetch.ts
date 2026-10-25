/** Workers lacks redirect:error. Enforce it using manual transport and rejection,
 * without following the Location or resending cookies/authorization to its target.
 */
export function createWorkerFetch(transport:typeof fetch=fetch):typeof fetch{
 return async(input,init)=>{
  const policy=init?.redirect??(input instanceof Request?input.redirect:'error')
  if(policy==='follow')throw new TypeError('automatic-redirect-not-permitted')
  const response=await transport(input,{...init,redirect:'manual'})
  if(policy==='error'&&[301,302,303,307,308].includes(response.status)){
   await response.body?.cancel()
   throw new TypeError('redirect-not-permitted')
  }
  return response
 }
}
