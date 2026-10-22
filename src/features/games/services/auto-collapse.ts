// A cancelled callback must remain inert even if it was already queued by the browser.
export function scheduleAutoCollapse(close:()=>void):()=>void {
 let active=true
 const timer=setTimeout(()=>{if(active){active=false;close()}},5000)
 return ()=>{if(active){active=false;clearTimeout(timer)}}
}
