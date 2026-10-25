export class OutboundBudgetError extends Error {
 constructor(){super('outbound-budget-exhausted');this.name='OutboundBudgetError'}
}
/** One instance per invocation, shared by credential, store and provider transports.
 * Counts dispatches, not successful responses. Does not count DNS/sockets/bindings.
 */
export function createOutboundBudget(options:{maximum:number;cleanupReserve?:number;fetcher?:typeof fetch}){
 const {maximum}=options,reserve=options.cleanupReserve??1
 if(!Number.isSafeInteger(maximum)||maximum<1||!Number.isSafeInteger(reserve)||reserve<0||reserve>=maximum)throw Error('invalid-outbound-budget')
 let dispatched=0
 const wrap=(cleanup:boolean):typeof fetch=>async(input,init)=>{
  const redirect=init?.redirect??(input instanceof Request?input.redirect:undefined)
  // Automatic redirects may consume additional platform subrequests invisibly.
  if(redirect==='follow')throw Error('automatic-redirect-not-budgeted')
  const signal=init?.signal??(input instanceof Request?input.signal:undefined)
  signal?.throwIfAborted()
  if(dispatched>=(cleanup?maximum:maximum-reserve))throw new OutboundBudgetError()
  dispatched++ // Reserve synchronously, before transport awaits; never refund failures.
  return (options.fetcher??fetch)(input,{...init,redirect:redirect??'error'})
 }
 return {fetch:wrap(false),cleanupFetch:wrap(true),usage:()=>({dispatched,remaining:maximum-dispatched,ordinaryRemaining:Math.max(0,maximum-reserve-dispatched)})}
}
