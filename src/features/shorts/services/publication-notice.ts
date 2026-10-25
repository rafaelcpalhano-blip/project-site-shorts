// Only confirmed publication messages expire. Cancellation also protects queued callbacks.
export function schedulePublicationDismiss(message:string,dismiss:()=>void):()=>void {
  if(message!=='Short publicado.')return ()=>{}
  let active=true
  const timer=setTimeout(()=>{if(active){active=false;dismiss()}},5000)
  return ()=>{active=false;clearTimeout(timer)}
}
