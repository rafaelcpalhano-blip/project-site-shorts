import {createRestStore} from '../server/firestore/rest-store.ts'
import {prepareCommentNumbers} from '../server/comments/comment-number.ts'
const args=process.argv.slice(2),apply=args.includes('--apply'),after=args.find(value=>value.startsWith('--after='))?.slice(8)
if(args.some(value=>value!=='--apply'&&!value.startsWith('--after='))||after!==undefined&&!/^[\w-]{1,128}$/.test(after))throw Error('Use [--apply] [--after=ID]')
// Fixed emulator-only adapter: never read a remote endpoint or project from env.
const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080})
const shorts=await store.scanShorts(after)
for(const row of shorts)console.log(JSON.stringify(await prepareCommentNumbers(row.id,store,apply)))
console.log(JSON.stringify({apply,shorts:shorts.length,next:shorts.length===30?shorts.at(-1).id:null}))
