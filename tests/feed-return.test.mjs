import test from 'node:test'
import assert from 'node:assert/strict'
import {saveFeedReturn,loadFeedReturn,feedOrigin} from '../src/features/shorts/services/feed-return.ts'
import {createCursorPages} from '../src/features/shorts/services/cursor-pages.ts'
test('retorno preserva páginas 1/2/3/5, filtro, ordem, scroll e cursores sem repetir consultas',async()=>{
 for(const index of [0,1,2,4]){
  let calls=0;const pager=createCursorPages(async cursor=>{calls++;const n=cursor??0;return {items:[{id:'s'+n}],next:n<4?n+1:null}})
  for(let n=0;n<=index;n++)await pager.load(n)
  const saved={index,filter:'tibia',order:'oldest',scroll:950,pager},key='history-'+index
  saveFeedReturn(key,saved);pager.cancel()
  assert.equal(feedOrigin({feedOrigin:key}),key)
  const restored=loadFeedReturn(key);assert.equal(restored,saved);assert.equal(restored.filter,'tibia');assert.equal(restored.scroll,950)
  assert.equal((await restored.pager.load(restored.index)).items[0].id,'s'+index);assert.equal(calls,index+1)
 }
})
test('URL direta, logo com nova chave e origem falsa não herdam contexto; cache é limitado e expira',()=>{
 assert.equal(loadFeedReturn('new-logo-history'),undefined);assert.equal(feedOrigin({feedOrigin:'https://evil.test'}),undefined)
 assert.equal(feedOrigin(null),undefined)
 saveFeedReturn('expire',{index:3},100);assert.ok(loadFeedReturn('expire',299999));assert.equal(loadFeedReturn('expire',300100),undefined)
 for(let n=0;n<11;n++)saveFeedReturn('bounded-'+n,{index:n})
 assert.equal(loadFeedReturn('bounded-0'),undefined);assert.equal(loadFeedReturn('bounded-10').index,10)
})
