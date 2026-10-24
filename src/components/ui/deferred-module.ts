export function createDeferredModule<T>(factory:()=>Promise<T>):()=>Promise<T> {
  let pending:Promise<T>|undefined
  return ()=>{
    if(!pending)pending=Promise.resolve().then(factory).catch(error=>{pending=undefined;throw error})
    return pending
  }
}
