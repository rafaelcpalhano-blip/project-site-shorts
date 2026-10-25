import test from 'node:test'
import assert from 'node:assert/strict'
import {readOrderedFeed} from '../server/ranking/read-feed.ts'
import {orderedFeedStore} from './helpers/ordered-feed-store.mjs'
function batched(d){
 d.batches=[]
 d.store.getMany=async paths=>{assert.ok(paths.length>=1&&paths.length<=4);assert.equal(new Set(paths).size,paths.length);d.batches.push([...paths]);return Promise.all(paths.map(path=>d.store.get(path)))}
 return d
}
for(const order of ['latest','oldest','likes','relevant'])test(order+': batch/fallback preserve complete DTOs, ordering, filters and cursors across pages',async()=>{
 for(const gameId of [undefined,'g1']){
  const normal=orderedFeedStore({count:47,mixed:true}),bulk=batched(orderedFeedStore({count:47,mixed:true}));let cursor,steps=0
  do{
   const input={order,gameId,...(cursor?{cursor}:{})},expected=await readOrderedFeed(input,normal),actual=await readOrderedFeed(input,bulk)
   assert.deepEqual(actual,expected);cursor=actual.next??undefined
   assert.ok(++steps<6)
  }while(cursor)
  assert.ok(bulk.batches.length>0)
 }
})
for(const order of ['latest','oldest','likes','relevant'])test(order+': batch revalidates current moderation after the query snapshot',async()=>{
 const normal=orderedFeedStore({count:35}),bulk=batched(orderedFeedStore({count:35}))
 for(const d of [normal,bulk]){
  const query=d.store.rankingPage
  d.store.rankingPage=async input=>{const result=await query(input);for(const [path,row]of d.docs)if(path.startsWith('shorts/')){if(Number(path.slice(-3))%3===0)row.moderationStatus='removed'}d.docs.get('games/g2').status='banned';d.docs.get('games/g3').status='hidden';return result}
 }
 const actual=await readOrderedFeed({order},bulk)
 assert.deepEqual(actual,await readOrderedFeed({order},normal))
 assert.ok(actual.items.every(row=>bulk.docs.get('shorts/'+row.id).moderationStatus==='published'&&!['g2','g3'].includes(row.gameId)))
})
test('missing current short/game preserves slots and cursor without extra reads or stale cross-request cache',async()=>{
 const normal=orderedFeedStore({count:35}),bulk=batched(orderedFeedStore({count:35}))
 for(const d of [normal,bulk]){const get=d.store.get;d.store.get=async path=>['shorts/s014','games/g3'].includes(path)?null:get(path)}
 assert.deepEqual(await readOrderedFeed({},bulk),await readOrderedFeed({},normal))
 for(const row of bulk.docs.values())if('status' in row)row.status='banned'
 assert.equal((await readOrderedFeed({},bulk)).items.length,0)
})
test('shared games are read once per request; hidden games are rechecked on the next request',async()=>{
 const d=batched(orderedFeedStore({count:15}));for(const [path,row]of d.docs)if(path.startsWith('shorts/'))row.gameId='g0'
 assert.equal((await readOrderedFeed({},d)).items.length,15)
 assert.equal(d.batches.flat().filter(path=>path==='games/g0').length,1)
 d.docs.get('games/g0').status='hidden'
 assert.equal((await readOrderedFeed({},d)).items.length,0)
 assert.equal(d.batches.flat().filter(path=>path==='games/g0').length,2)
})
for(const stage of ['shorts','games'])test(stage+': a failed batch rejects the page and never starts a later window',async()=>{
 const d=batched(orderedFeedStore()),read=d.store.getMany
 d.store.getMany=async paths=>{if(paths[0].startsWith(stage+'/'))throw Error('fixture-private-detail');return read(paths)}
 await assert.rejects(readOrderedFeed({},d),/fixture-private-detail/)
 assert.equal(d.stats.pages,1);assert.ok(d.batches.length<=1)
})
test('incomplete batch rejects rather than silently skipping candidates',async()=>{
 const d=batched(orderedFeedStore());d.store.getMany=async()=>[]
 await assert.rejects(readOrderedFeed({},d),/invalid-batch/);assert.equal(d.stats.pages,1)
})
