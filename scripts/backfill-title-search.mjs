import { TITLE_SEARCH_ENABLED } from '../src/lib/features/title-search.ts'
// Fixed emulator only. Stop the local API while migrating; never deploy this script.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {backfillTitlePage} from '../server/search/backfill-titles.ts'
if (!TITLE_SEARCH_ENABLED) throw new Error('Pesquisa desativada por decisão de produto. Backfill não autorizado.')
const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080})
try{
 await store.transact(async tx=>tx.set('searchState/title-v1',{ready:false}))
 let after,examined=0,updated=0
 do{const page=await backfillTitlePage(store,after);examined+=page.examined;updated+=page.updated;after=page.next??undefined}while(after)
 await store.transact(async tx=>tx.set('searchState/title-v1',{ready:true,version:1,completedAt:new Date()}))
 console.log(JSON.stringify({project:'demo-clipzone',examined,updated,ready:true}))
}catch{console.error('Indexação local incompleta. Pesquisa permanece indisponível; registros preservados. Corrija e repita o comando local.');process.exitCode=1}
