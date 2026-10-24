import test from 'node:test'
import assert from 'node:assert/strict'
import {clipperMessages} from '../src/components/clipper/messages.ts'
import {createMessageDeck,createClipperInteraction} from '../src/components/clipper/interaction.ts'
function clock(){let time=0,next=0;const tasks=new Map();return {now:()=>time,schedule:(fn,delay)=>{tasks.set(++next,{fn,at:time+delay});return next},cancel:id=>tasks.delete(id),size:()=>tasks.size,tick(ms){const target=time+ms;for(let limit=0;limit<10000;limit++){const ordered=[...tasks].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at);if(!ordered.length)break;const [id,task]=ordered[0];tasks.delete(id);time=task.at;task.fn()}time=target}}}
const create=()=>{const c=clock();return {c,interaction:createClipperInteraction({messages:clipperMessages,random:()=>.42,now:c.now,schedule:c.schedule,cancel:c.cancel})}}
test('bank preserves exactly the fourteen approved messages, without additions or duplicates',()=>{
 assert.deepEqual(clipperMessages,[
 'Entre, explore e descubra novos criadores!','Todo grande momento merece ser compartilhado!','Aqui, a comunidade é quem faz acontecer!','Sua próxima descoberta pode estar a um clique!','Tem sempre uma jogada nova por aqui!','De jogadores para jogadores. Simples assim!','Um link, um jogo e pronto: compartilhe seu short!','YouTube, Twitch e TikTok? Todos têm espaço aqui!','Seus vídeos continuam nas plataformas de origem!','Aqui reunimos jogadas de diferentes plataformas!','Não precisa criar conta para compartilhar!','Escolha um jogo e encontre shorts sobre ele!','Curtiu um vídeo? Deixe seu coração!','Compartilhar aqui é gratuito!'])
})
test('shuffled cycle exhausts unused messages and never duplicates the four simultaneous balloons',()=>{
 const deck=createMessageDeck(clipperMessages,()=>.37),cycle=Array.from({length:14},()=>deck.draw());assert.equal(new Set(cycle).size,14)
 const visible=Array.from({length:4},()=>deck.draw());for(let n=0;n<300;n++){const slot=n%4,old=visible[slot];visible[slot]=deck.draw(visible);assert.notEqual(visible[slot],old);assert.equal(new Set(visible).size,4)}
 const other=createMessageDeck(clipperMessages,()=>.81);assert.notDeepEqual(cycle,Array.from({length:14},()=>other.draw()))
})
test('individual puff waits 2.5 seconds, ignores repeated clicks and preserves the other balloons',()=>{
 const {c,interaction:i}=create(),original=[...i.getSnapshot().messages];i.pop(1);i.pop(1);assert.equal(c.size(),1);c.tick(2499);assert.deepEqual(i.getSnapshot().messages,original);c.tick(1);assert.notEqual(i.getSnapshot().messages[1],original[1]);for(const n of [0,2,3])assert.equal(i.getSnapshot().messages[n],original[n]);assert.ok(i.getSnapshot().waiting.every(x=>!x))
})
test('fifteenth interaction synchronizes all balloons and cancels earlier replacements; counter continues',()=>{
 const {c,interaction:i}=create(),original=[...i.getSnapshot().messages];i.pop(0);c.tick(1000);for(let n=0;n<15;n++)i.tickle();c.tick(1500);assert.deepEqual(i.getSnapshot().messages,original);c.tick(1000);assert.equal(i.getSnapshot().count,15);assert.equal(new Set(i.getSnapshot().messages).size,4);assert.ok(i.getSnapshot().messages.every(m=>!original.includes(m)));for(let n=0;n<15;n++)i.tickle();assert.equal(i.getSnapshot().count,30);assert.ok(i.getSnapshot().waiting.every(Boolean));i.dispose();assert.equal(c.size(),0)
})
test('repeated tickles keep frame cadence; last frame holds two seconds and renewed interaction cancels return',()=>{
 const {c,interaction:i}=create();i.tickle();assert.equal(i.getSnapshot().frame,1);c.tick(160);assert.equal(i.getSnapshot().frame,2);i.tickle();assert.equal(i.getSnapshot().frame,2);c.tick(160);assert.equal(i.getSnapshot().frame,3);c.tick(320);const held=i.getSnapshot().frame;c.tick(1999);assert.equal(i.getSnapshot().frame,held);i.tickle();assert.equal(i.getSnapshot().frame,held);c.tick(1);assert.equal(i.getSnapshot().laughing,true);c.tick(3000);assert.equal(i.getSnapshot().frame,0);assert.equal(i.getSnapshot().laughing,false)
})
test('unmount clears every frame, return and balloon timer and prevents subsequent notifications',()=>{
 const {c,interaction:i}=create();let changes=0;i.subscribe(()=>changes++);i.pop(2);i.tickle();const before=changes;i.dispose();assert.equal(c.size(),0);c.tick(20000);i.tickle();i.pop(1);assert.equal(changes,before)
})
