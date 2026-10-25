// Tab-local public feed context. No storage, visitor data, modal state or artificial history.
const entries=new Map<string,{savedAt:number;value:unknown}>()
const lifetime=5*60_000,maximum=10
export function saveFeedReturn<T>(key:string,value:T,now=Date.now()){
 entries.delete(key);entries.set(key,{savedAt:now,value})
 while(entries.size>maximum)entries.delete(entries.keys().next().value!)
}
export function loadFeedReturn<T>(key:unknown,now=Date.now()):T|undefined{
 if(typeof key!=='string')return undefined
 const found=entries.get(key)
 if(!found)return undefined
 if(now-found.savedAt>=lifetime){entries.delete(key);return undefined}
 return found.value as T
}
export function feedOrigin(state:unknown):string|undefined{
 if(!state||typeof state!=='object')return undefined
 const key=(state as Record<string,unknown>).feedOrigin
 return typeof key==='string'&&loadFeedReturn(key)!==undefined?key:undefined
}
