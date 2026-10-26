export interface TikTokBackoff {
 remainingSeconds:()=>number
 defer:(retryAfter:string|null)=>number
}
export function retryAfterSeconds(value:unknown):number|undefined {
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:undefined
}
/** Negative availability only: no video evidence, transport, identity or authorization is cached. */
export function createTikTokBackoff(now:()=>number=Date.now):TikTokBackoff {
 let until=0
 const clock=()=>{const value=now();if(!Number.isSafeInteger(value)||value<0)throw Error('invalid-provider-clock');return value}
 return {
  remainingSeconds:()=>Math.max(0,Math.ceil((until-clock())/1000)),
  defer:header=>{
   const started=clock(),raw=header?.trim()??''
   let seconds=60
   if(/^\d{1,9}$/.test(raw))seconds=Math.max(1,Number(raw))
   else if(raw.length<=128&&/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(raw)){
    const parsed=Date.parse(raw)
    if(Number.isFinite(parsed))seconds=Math.max(1,Math.ceil((parsed-started)/1000))
   }
   until=Math.max(until,started+seconds*1000)
   return Math.max(1,Math.ceil((until-started)/1000))
  },
 }
}
