// Local emulated maintenance only. No cloud credentials or public endpoint.
import {createRestStore} from '../server/firestore/rest-store.ts'
import {cleanupLikes} from '../server/likes/retention.ts'
const [mode,collection,after,...extra]=process.argv.slice(2)
if(!['inspect','apply'].includes(mode)||!['shortLikes','likeAttempts'].includes(collection)||extra.length||after!==undefined&&!/^[a-f0-9]{64}$/.test(after))throw Error('Use inspect|apply shortLikes|likeAttempts [cursor]')
const result=await cleanupLikes({store:createRestStore({projectId:'demo-clipzone',emulatorPort:8080}),now:()=>new Date(),collection,after,apply:mode==='apply'})
console.log(JSON.stringify(result))
