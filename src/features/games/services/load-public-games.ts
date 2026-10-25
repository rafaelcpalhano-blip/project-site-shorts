import type {Game} from '../../shorts/types/models.ts'
export async function loadPublicGames<C>(read:(cursor?:C)=>Promise<{items:Game[];next:C|null}>){
 const games=new Map<string,Game>(),seen=new Set<string>();let cursor:C|undefined
 do{
  const page=await read(cursor)
  for(const game of page.items)games.set(game.id,game)
  if(page.next===null)break
  const key=JSON.stringify(page.next)
  if(seen.has(key))throw Error('A paginação do catálogo não avançou.')
  seen.add(key);cursor=page.next
 }while(cursor!==undefined)
 return [...games.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id))
}
