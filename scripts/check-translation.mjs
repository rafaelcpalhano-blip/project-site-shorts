// Explicit local-only acceptance command. Never deploy this script.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {createDescriptionTranslator} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
const id=process.argv[2]
try {
 if(!/^igdb-[1-9]\d{0,9}$/.test(id??'')||process.env.CLIPZONE_TRANSLATION_ENABLED!=='true')throw new Error('configuration-required')
 const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080})
 const translate=createGameTranslation({store,now:()=>new Date(),maximumPerDay:20,translate:createDescriptionTranslator({
  accountId:process.env.CLOUDFLARE_ACCOUNT_ID?.trim()??'',token:process.env.CLOUDFLARE_AI_TOKEN?.trim()??'',
 })})
 await translate(id)
 const game=await store.transact(tx=>tx.get('games/'+id))
 if(!game||!game.translation||game.translation.sourceDescription!==game.description||game.translation.sourceName!==game.officialName){
  const state=await store.transact(tx=>tx.get('gameTranslations/'+id))
  console.log('Sem tradução atual: '+(state?.status??'jogo ausente, descrição vazia/longa ou limite atingido')+'. Original preservado.');process.exitCode=1
 }else{
  console.log('Jogo: '+game.officialName+' | '+id)
  console.log('Original: '+game.description)
  console.log('pt-BR: '+game.translation.text)
 }
}catch{console.error('Teste não concluído. Confira configuração privada, emulador e disponibilidade gratuita do Workers AI. Nenhuma credencial foi exibida.');process.exitCode=1}
