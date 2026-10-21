// Synthetic only: calls the actual search algorithm with an in-memory Firestore port.
import {titleSearchFields} from '../src/lib/validation/title-search.ts'
import {searchTitles} from '../server/search/search-titles.ts'
const rows=Array.from({length:1000},(_,i)=>{
 const title=i%10===0?'Minha virada épica no Portal '+i:'Minha vitória no Tibia '+i
 return {id:'sample-'+String(i).padStart(4,'0'),data:{title,...titleSearchFields(title),moderationStatus:'published',platform:'Twitch',platformVideoId:'Sample'+i,normalizedUrl:'https://clips.twitch.tv/Sample'+i,gameId:'portal',createdAt:new Date(1700000000000+i*1000)}}
}).reverse()
console.log(JSON.stringify({synthetic:true,titles:rows.length,averageFragments:rows.reduce((n,r)=>n+r.data.searchFragments.length,0)/rows.length,averageFieldsJsonBytes:rows.reduce((n,r)=>n+Buffer.byteLength(JSON.stringify(titleSearchFields(r.data.title))),0)/rows.length}))
for(const query of ['virada','minha virada','minha vitória épica','a','ÉPICA']){
 const store={transact:async work=>work({get:async()=>({ready:true})}),searchShorts:async q=>rows.filter(r=>r.data.searchFragments.includes(q.fragment)&&(!q.cursor||r.data.createdAt.toISOString()<q.cursor.time||r.data.createdAt.toISOString()===q.cursor.time&&r.id<q.cursor.id)).slice(0,q.limit)}
 let cursor,calls=0,matches=0,read=0,partial=0,maxCandidates=0
 do{const page=await searchTitles({query,...(cursor?{cursor}:{})},store);calls++;matches+=page.items.length;read+=page.candidatesRead;maxCandidates=Math.max(maxCandidates,page.candidatesRead);if(page.limited)partial++;cursor=page.next}while(cursor)
 console.log(JSON.stringify({query,matches,calls,candidateDocumentsRead:read,limitedPages:partial,maxCandidatesPerCall:maxCandidates}))
}
const fields=titleSearchFields(Array.from({length:500},(_,i)=>String.fromCharCode(0x4e00+i)).join(''))
console.log(JSON.stringify({longTitleUtf16Length:500,uniqueFragments:fields.searchFragments.length,estimatedCompositeIndexEntries:2*fields.searchFragments.length,fieldsJsonBytes:Buffer.byteLength(JSON.stringify(fields)),note:'Not a measurement of actual Firestore storage, billed reads, index entries scanned or latency.'}))
