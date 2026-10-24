import test from 'node:test'
import assert from 'node:assert/strict'
import {createCursorPages} from '../src/features/shorts/services/cursor-pages.ts'
const page=(start,count,next)=>({items:Array.from({length:count},(_,n)=>({id:String(start+n)})),next})
test('15 per page, forward 1→2→3 and backward reuse cursors, no prefetch or duplicated reads',async()=>{
 const calls=[],pages=[page(1,15,'c2'),page(16,15,'c3'),page(31,5,null)]
 const pager=createCursorPages(async cursor=>{calls.push(cursor);return pages[cursor==='c2'?1:cursor==='c3'?2:0]})
 const [one,same]=await Promise.all([pager.load(0),pager.load(0)]);assert.equal(one,same);assert.deepEqual(calls,[undefined])
 const two=await pager.adjacent(0,1,one.items.map(x=>x.id));assert.equal(two.target.id,'16');assert.equal(two.index,1)
 const three=await pager.adjacent(1,1,two.page.items.map(x=>x.id));assert.equal(three.target.id,'31');assert.equal(three.index,2)
 assert.equal(await pager.adjacent(2,1,three.page.items.map(x=>x.id)),null)
 const back=await pager.adjacent(2,-1,three.page.items.map(x=>x.id));assert.equal(back.target.id,'30')
 assert.equal((await pager.adjacent(1,-1,two.page.items.map(x=>x.id))).target.id,'15')
 assert.equal(await pager.adjacent(0,-1,[]),null);assert.deepEqual(calls,[undefined,'c2','c3'])
 assert.deepEqual(pager.knownCursors(),[undefined,'c2','c3'])
})
test('failed boundary keeps cached current page and retry reuses same cursor',async()=>{
 let fail=true,calls=0
 const pager=createCursorPages(async cursor=>{calls++;if(!cursor)return page(1,15,'c2');if(fail)throw Error('network');return page(16,2,null)})
 const first=await pager.load(0);await assert.rejects(pager.adjacent(0,1,[]));assert.equal(await pager.load(0),first)
 fail=false;assert.equal((await pager.adjacent(0,1,[])).target.id,'16');assert.equal(calls,3)
})
test('empty/now-hidden and duplicate-only pages are skipped without inventing rows; cursor loops fail',async()=>{
 const pages=[page(1,1,'a'),page(1,1,'b'),page(0,0,'c'),page(2,1,null)]
 const pager=createCursorPages(async cursor=>pages[cursor==='a'?1:cursor==='b'?2:cursor==='c'?3:0])
 await pager.load(0);const next=await pager.adjacent(0,1,['1']);assert.equal(next.index,3);assert.equal(next.target.id,'2')
 const loop=createCursorPages(async cursor=>page(1,0,cursor||'a'));await loop.load(0);await assert.rejects(loop.load(1),/paginação não avançou/)
})
test('cancelled and late reads cannot populate cache; new query context never reuses old filters/order',async()=>{
 let resolve,calls=0
 const pager=createCursorPages(async()=>{calls++;return new Promise(r=>resolve=r)})
 const pending=pager.load(0);await Promise.resolve();pager.cancel();resolve(page(1,1,null));await assert.rejects(pending,{name:'AbortError'})
 const retry=pager.load(0);await Promise.resolve();resolve(page(2,1,null));assert.equal((await retry).items[0].id,'2');assert.equal(calls,2)
 const filtered=createCursorPages(async()=>page(100,1,null));assert.equal((await filtered.load(0)).items[0].id,'100')
})
test('engagement patches survive revisiting cached pages',async()=>{
 const pager=createCursorPages(async()=>({items:[{id:'1',likeCount:0}],next:null}));await pager.load(0)
 pager.update(p=>({...p,items:p.items.map(item=>({...item,likeCount:2}))}));assert.equal((await pager.load(0)).items[0].likeCount,2)
})
