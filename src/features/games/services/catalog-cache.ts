import type {Game} from '../../shorts/types/models.ts'

let version=0
const listeners=new Set<()=>void>()
export const getGameCatalogVersion=()=>version
export function subscribeGameCatalog(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function invalidateGameCatalog(){version++;for(const listener of listeners)listener()}

interface CatalogPage<C>{items:Game[];next:C|null}
const copyPage=<C>(page:CatalogPage<C>):CatalogPage<C>=>({...page,items:page.items.map(game=>({...game}))})

// Only public game names/IDs, in memory. Never cache failures or private catalog data.
export function createGameCatalogPageCache<C>(load:(cursor?:C)=>Promise<CatalogPage<C>>,now=Date.now,maxAge=30_000){
 let observedVersion=version,generation=0,expiresAt=0
 const pages=new Map<C|undefined,CatalogPage<C>>()
 const pending=new Map<C|undefined,Promise<CatalogPage<C>>>()
 return (cursor?:C):Promise<CatalogPage<C>>=>{
  if(observedVersion!==version||(pages.size>0&&now()>=expiresAt)){
   observedVersion=version;generation++;pages.clear();pending.clear();expiresAt=0
  }
  const cached=pages.get(cursor)
  if(cached)return Promise.resolve(copyPage(cached))
  let work=pending.get(cursor)
  if(!work){
   const startedGeneration=generation,startedVersion=version
   work=Promise.resolve().then(()=>load(cursor)).then(page=>{
    if(startedGeneration!==generation||startedVersion!==version)throw new Error('O catálogo mudou. Atualize os jogos e tente novamente.')
    const saved=copyPage(page)
    if(!expiresAt)expiresAt=now()+maxAge
    pages.set(cursor,saved)
    return saved
   }).finally(()=>{if(pending.get(cursor)===work)pending.delete(cursor)})
   pending.set(cursor,work)
  }
  return work.then(copyPage)
 }
}
