import type {Direction} from './sequence-navigation.ts'
export interface CursorPage<T,C> {items:T[];next:C|null}
/** One query context, visited pages only. Shared in-flight reads; no prefetch. */
export function createCursorPages<T extends {id:string},C,P extends CursorPage<T,C>>(fetchPage:(cursor:C|undefined,signal:AbortSignal)=>Promise<P>){
 const pages=new Map<number,P>(),cursors=new Map<number,C|undefined>([[0,undefined]]),requests=new Map<number,{promise:Promise<P>;controller:AbortController}>()
 let generation=0
 const load=(index:number):Promise<P>=>{
  if(!Number.isSafeInteger(index)||index<0||!cursors.has(index))return Promise.reject(Error('Página indisponível. Atualize o feed.'))
  const cached=pages.get(index);if(cached)return Promise.resolve(cached)
  const pending=requests.get(index);if(pending)return pending.promise
  const controller=new AbortController(),version=generation
  const promise=Promise.resolve().then(()=>fetchPage(cursors.get(index),controller.signal)).then(page=>{
   if(version!==generation||controller.signal.aborted)throw new DOMException('Consulta cancelada','AbortError')
   if(page.next!==null&&[...cursors.values()].some(cursor=>cursor!==undefined&&JSON.stringify(cursor)===JSON.stringify(page.next)))throw Error('A paginação não avançou. Atualize o feed.')
   pages.set(index,page);if(page.next!==null)cursors.set(index+1,page.next)
   return page
  }).finally(()=>{if(requests.get(index)?.promise===promise)requests.delete(index)})
  requests.set(index,{promise,controller});return promise
 }
 return {load,
  knownCursors:()=>Array.from({length:Math.max(...cursors.keys())+1},(_,i)=>cursors.get(i)),
  update:(patch:(page:P)=>P)=>pages.forEach((page,index)=>pages.set(index,patch(page))),
  cancel:()=>{generation++;requests.forEach(request=>request.controller.abort());requests.clear()},
  async adjacent(index:number,direction:Direction,excluded:Iterable<string>){
   const seen=new Set(excluded)
   let position=index
   while(true){
    const current=await load(position)
    if(direction===-1&&position===0||direction===1&&current.next===null)return null
    position+=direction
    const page=await load(position),rows=direction===1?page.items:[...page.items].reverse()
    const target=rows.find(row=>!seen.has(row.id))
    if(target)return {index:position,page,target}
    rows.forEach(row=>seen.add(row.id))
   }
  },
 }
}
