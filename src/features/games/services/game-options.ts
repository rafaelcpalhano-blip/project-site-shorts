import type {Game as GameOption} from '../../shorts/types/models'
export const normalizeGameName=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')
const collator=new Intl.Collator('pt-BR',{sensitivity:'base',numeric:true})
// Restricted edit distance: numeric sequel tokens never approximate.
function near(a:string,b:string){
 if(a.length<4||b.length<4||a.length>64||b.length>64||/^\d+$/.test(a)||/^\d+$/.test(b))return false
 const limit=Math.min(a.length,b.length)>=8?2:1
 if(Math.abs(a.length-b.length)>limit)return false
 let previous=Array.from({length:b.length+1},(_,i)=>i),older=previous
 for(let i=1;i<=a.length;i++){
  const row=[i]
  for(let j=1;j<=b.length;j++){
   row[j]=Math.min(previous[j]+1,row[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1))
   if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],older[j-2]+1)
  }
  older=previous;previous=row
 }
 return previous[b.length]<=limit
}
export function gameNameScore(name:string,query:string){
 const title=normalizeGameName(name),needle=normalizeGameName(query)
 if(!needle)return 0
 if(needle.length>100)return Infinity
 if(title===needle)return 0
 if(title.startsWith(needle))return 1
 if(title.includes(needle))return 2
 const words=title.split(' '),tokens=[...new Set(needle.split(' '))]
 if(tokens.every(token=>words.some(word=>word.startsWith(token))))return 3
 if(tokens.every(token=>words.some(word=>word.includes(token))))return 4
 if(tokens.every(token=>words.some(word=>word.includes(token)||near(token,word))))return 5
 return Infinity
}
export function filterGameOptions(games:GameOption[],query:string){
 return [...new Map(games.map(game=>[game.id,game])).values()].map(game=>({game,score:gameNameScore(game.name,query)})).filter(item=>Number.isFinite(item.score)).sort((a,b)=>a.score-b.score||collator.compare(a.game.name,b.game.name)||a.game.name.localeCompare(b.game.name,'pt-BR')||a.game.id.localeCompare(b.game.id)).map(item=>item.game)
}
