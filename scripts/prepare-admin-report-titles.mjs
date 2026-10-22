// Deliberately local-only. No remote project or credential is accepted.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {prepareReportTitles} from '../server/admin/prepare-report-titles.ts'
const port=Number(process.argv[2]??8080)
if(![8080,8081].includes(port)||process.argv[3]!=='--apply')throw Error('Uso: node scripts/prepare-admin-report-titles.mjs 8080 --apply (somente emulador)')
const store=createRestStore({projectId:port===8081?'demo-clipzone-tests':'demo-clipzone',emulatorPort:port})
const result=await prepareReportTitles(store)
console.log(JSON.stringify({environment:'emulator',...result}))
