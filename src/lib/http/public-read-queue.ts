// Coordinate public reads within this browser context only. The server still validates/counts every request.
// Separate transports never share a queue. Settled queues release their references; failures do not block retry.
const queues=new WeakMap<typeof fetch,Promise<void>>()
export async function coordinatePublicRead<T>(transport:typeof fetch,signal:AbortSignal,read:()=>Promise<T>):Promise<T>{
 signal.throwIfAborted()
 const previous=queues.get(transport)??Promise.resolve()
 const scheduled=previous.then(()=>{signal.throwIfAborted();return read()})
 const settled=scheduled.then(()=>{},()=>{})
 queues.set(transport,settled)
 void settled.then(()=>{if(queues.get(transport)===settled)queues.delete(transport)})
 // An aborted caller returns immediately; its queued operation is skipped without releasing an active predecessor.
 return new Promise<T>((resolve,reject)=>{
  const abort=()=>reject(signal.reason)
  signal.addEventListener('abort',abort,{once:true})
  if(signal.aborted)abort()
  void scheduled.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort))
 })
}
