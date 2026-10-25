import test from 'node:test'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {clipperMessages} from '../src/components/clipper/messages.ts'
import {createMessageDeck,createClipperInteraction} from '../src/components/clipper/interaction.ts'
function clock(){let time=0,next=0;const tasks=new Map();return {now:()=>time,schedule:(fn,delay)=>{tasks.set(++next,{fn,at:time+delay});return next},cancel:id=>tasks.delete(id),size:()=>tasks.size,tick(ms){const target=time+ms;for(let limit=0;limit<10000;limit++){const ordered=[...tasks].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at);if(!ordered.length)break;const [id,task]=ordered[0];tasks.delete(id);time=task.at;task.fn()}time=target}}}
const create=()=>{const c=clock();return {c,interaction:createClipperInteraction({messages:clipperMessages,random:()=>.42,schedule:c.schedule,cancel:c.cancel})}}
test('bank contains the 47 approved messages without normalized duplicates',()=>{
 assert.equal(clipperMessages.length,47)
 assert.equal(createHash('sha256').update(clipperMessages.join('\n')).digest('hex'),'fcfd185d51f9511dbe4a27a191d71b9bd119be85b9c638796b82cc1ce94d2f4f')
 assert.equal(new Set(clipperMessages.map(text=>text.trim().replace(/\s+/g,' '))).size,47)
 assert.equal(clipperMessages[0],'Oi, eu sou o Clipper!')
 assert.equal(clipperMessages.at(-1),'Diversão boa é aquela que todo mundo pode aproveitar!')
 assert.ok(!clipperMessages.includes('Compartilhar aqui é gratuito!'))
})
test('shuffled cycle exhausts unused messages and never duplicates the four simultaneous balloons',()=>{
 const deck=createMessageDeck(clipperMessages,()=>.37),cycle=Array.from({length:47},()=>deck.draw());assert.equal(new Set(cycle).size,47)
 const visible=Array.from({length:4},()=>deck.draw());for(let n=0;n<300;n++){const slot=n%4,old=visible[slot];visible[slot]=deck.draw(visible);assert.notEqual(visible[slot],old);assert.equal(new Set(visible).size,4)}
 const other=createMessageDeck(clipperMessages,()=>.81);assert.notDeepEqual(cycle,Array.from({length:47},()=>other.draw()))
})
test('individual puff waits 2 seconds, ignores repeated clicks and preserves the other balloons',()=>{
 const {c,interaction:i}=create(),original=[...i.getSnapshot().messages];i.pop(1);i.pop(1);assert.equal(c.size(),1);c.tick(1999);assert.deepEqual(i.getSnapshot().messages,original);c.tick(1);assert.notEqual(i.getSnapshot().messages[1],original[1]);for(const n of [0,2,3])assert.equal(i.getSnapshot().messages[n],original[n]);assert.ok(i.getSnapshot().waiting.every(x=>!x))
})
test('tenth interaction resets count, synchronizes all balloons and cancels earlier replacements',()=>{
 const {c,interaction:i}=create(),original=[...i.getSnapshot().messages];i.pop(0);c.tick(1000);for(let n=0;n<10;n++)i.tickle();c.tick(1000);assert.deepEqual(i.getSnapshot().messages,original);c.tick(1000);assert.equal(i.getSnapshot().count,0);assert.equal(new Set(i.getSnapshot().messages).size,4);assert.ok(i.getSnapshot().messages.every(m=>!original.includes(m)));for(let n=0;n<10;n++)i.tickle();assert.equal(i.getSnapshot().count,0);assert.ok(i.getSnapshot().waiting.every(Boolean));i.dispose();assert.equal(c.size(),0)
})
test('each click advances exactly one frame, inactivity never advances frames and return is two seconds after latest click',()=>{
 const {c,interaction:i}=create()
 for(const frame of [1,2,3,1]){i.tickle();assert.equal(i.getSnapshot().frame,frame);c.tick(500);assert.equal(i.getSnapshot().frame,frame)}
 c.tick(1499);assert.equal(i.getSnapshot().frame,1);i.tickle();assert.equal(i.getSnapshot().frame,2);c.tick(1999);assert.equal(i.getSnapshot().frame,2);c.tick(1);assert.equal(i.getSnapshot().frame,0);assert.equal(i.getSnapshot().laughing,false);assert.equal(c.size(),0)
})
test('unmount clears every frame, return and balloon timer and prevents subsequent notifications',()=>{
 const {c,interaction:i}=create();let changes=0;i.subscribe(()=>changes++);i.pop(2);i.tickle();const before=changes;i.dispose();assert.equal(c.size(),0);c.tick(20000);i.tickle();i.pop(1);assert.equal(changes,before)
})

test('collective clear immediately restores original pose, hides laughter and keeps the first-interaction marker across cycles',()=>{
 const {c,interaction:i}=create()
 assert.equal(i.getSnapshot().hasInteracted,false)
 for(let cycle=0;cycle<2;cycle++){
  for(let n=1;n<10;n++){i.tickle();assert.equal(i.getSnapshot().frame,(n-1)%3+1);assert.equal(i.getSnapshot().laughing,true)}
  i.tickle()
  assert.equal(i.getSnapshot().frame,0);assert.equal(i.getSnapshot().laughing,false);assert.equal(i.getSnapshot().count,0)
  assert.equal(i.getSnapshot().hasInteracted,true);assert.ok(i.getSnapshot().waiting.every(Boolean));assert.equal(c.size(),1)
  c.tick(1999);assert.equal(i.getSnapshot().laughing,false);assert.equal(i.getSnapshot().frame,0)
  c.tick(1);assert.ok(i.getSnapshot().waiting.every(value=>!value));assert.equal(i.getSnapshot().frame,0);assert.equal(c.size(),0)
 }
 i.tickle();assert.equal(i.getSnapshot().frame,1);assert.equal(i.getSnapshot().laughing,true)
})
