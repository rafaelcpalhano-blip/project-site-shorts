import type { AtomicStore, RecordData } from '../firestore/atomic-store.ts'
import type { DescriptionInput } from './translate-description.ts'
import { TRANSLATION_MODEL, translationFailureDetails } from './translate-description.ts'
async function hash(game:RecordData) {
 const source=JSON.stringify([game.description,game.officialName,game.aliases??[],TRANSLATION_MODEL,'pt-BR',2])
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('')
}
function clock(now:()=>Date){const value=now();if(!Number.isSafeInteger(value.getTime())||value.getTime()<0)throw new Error('invalid-clock');return value}
export function createGameTranslation(options:{store:AtomicStore;now:()=>Date;translate:(input:DescriptionInput)=>Promise<string>;maximumPerDay:number}) {
 if(!Number.isSafeInteger(options.maximumPerDay)||options.maximumPerDay<1||options.maximumPerDay>20)throw new Error('invalid-translation-budget')
 return async(id:string)=>{
  if(!/^igdb-[1-9]\d{0,9}$/.test(id))throw new Error('invalid-game-id')
  const leaseId=crypto.randomUUID()
  const claimed=await options.store.transact(async tx=>{
   const game=await tx.get('games/'+id)
   if(!game||game.status!=='active'||game.source!=='IGDB'||typeof game.description!=='string'||!game.description.trim()||game.description.length>8000||typeof game.officialName!=='string')return null
   const sourceHash=await hash(game)
   const translated=game.translation as RecordData|undefined
   if(translated?.sourceHash===sourceHash&&translated.locale==='pt-BR'&&typeof translated.text==='string'&&translated.text.trim())return null
   const task=await tx.get('gameTranslations/'+id)
   const now=clock(options.now),day=now.toISOString().slice(0,10)
   const budget=await tx.get('translationUsage/'+day)
   if(task){
    if(!(task.retryAt instanceof Date)||!Number.isFinite(task.retryAt.getTime())||!Number.isSafeInteger(task.attempts)||Number(task.attempts)<0)throw new Error('invalid-translation-task')
    if(task.retryAt>now&&(task.status==='running'||task.status==='failed'&&task.sourceHash===sourceHash))return null
    if(task.sourceHash===sourceHash&&task.day===day&&Number(task.attempts)>=3)return null
   }
   if(budget&&(!Number.isSafeInteger(budget.count)||Number(budget.count)<0))throw new Error('invalid-translation-budget-record')
   const count=Number(budget?.count??0)
   if(count>=options.maximumPerDay)return null
   tx.set('gameTranslations/'+id,{sourceHash,leaseId,day,attempts:task?.sourceHash===sourceHash&&task.day===day?Number(task.attempts)+1:1,status:'running',retryAt:new Date(now.getTime()+120000),updatedAt:now})
   tx.set('translationUsage/'+day,{count:count+1,updatedAt:now})
   return {sourceHash,input:{description:game.description,officialName:game.officialName,aliases:Array.isArray(game.aliases)?game.aliases.filter((v):v is string=>typeof v==='string'):[]}}
  })
  if(!claimed)return
  try{
   const text=await options.translate(claimed.input)
   if(!text.trim()||text.length>24000)throw new Error('invalid-translation')
   await options.store.transact(async tx=>{
    const task=await tx.get('gameTranslations/'+id),game=await tx.get('games/'+id)
    if(!task||task.leaseId!==leaseId||!game)return
    const now=clock(options.now)
    if(game.status!=='active'||await hash(game)!==claimed.sourceHash){tx.set('gameTranslations/'+id,{...task,status:'stale',retryAt:now,updatedAt:now});return}
    tx.set('games/'+id,{...game,translation:{text,locale:'pt-BR',model:TRANSLATION_MODEL,sourceHash:claimed.sourceHash,sourceDescription:game.description,sourceName:game.officialName,translatedAt:now}})
    tx.set('gameTranslations/'+id,{...task,status:'ready',updatedAt:now})
   })
  }catch(reason){
   // Failure is private, generic and cannot undo the game or consume video quota.
   await options.store.transact(async tx=>{
    const task=await tx.get('gameTranslations/'+id)
    if(task?.leaseId===leaseId){const now=clock(options.now);tx.set('gameTranslations/'+id,{...task,status:'failed',retryAt:new Date(now.getTime()+3600000),updatedAt:now,failure:translationFailureDetails(reason)})}
   })
  }
 }
}
