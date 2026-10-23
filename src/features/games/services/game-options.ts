import type { Game as GameOption } from '../../shorts/types/models'
export const normalizeGameName=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
const collator=new Intl.Collator('pt-BR',{sensitivity:'base',numeric:true})
export function filterGameOptions(games:GameOption[],query:string){
  const needle=normalizeGameName(query.trim())
  return [...new Map(games.map(game=>[game.id,game])).values()].filter(game=>normalizeGameName(game.name).includes(needle)).sort((a,b)=>collator.compare(a.name,b.name)||a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id))
}
