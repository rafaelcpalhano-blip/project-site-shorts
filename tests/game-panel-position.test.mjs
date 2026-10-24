import test from 'node:test'
import assert from 'node:assert/strict'
import {gamePanelPosition} from '../src/features/games/services/game-panel-position.ts'
const view={top:0,left:0,width:390,height:844}
test('below anchor when six rows fit, without exceeding viewport edges',()=>{
 const p=gamePanelPosition({top:100,bottom:148,left:24,width:342},view)
 assert.equal(p.up,false);assert.equal(p.top,152);assert.equal(p.height,358);assert.equal(p.left,24);assert.equal(p.width,342)
})
test('upward anchor uses actual panel height: short, empty and six-row results all end four pixels before trigger',()=>{
 const anchor={top:650,bottom:698,left:24,width:342},p=gamePanelPosition(anchor,view)
 assert.equal(p.up,true);assert.equal(p.top,646)
 for(const actualHeight of [96,140,358]){const renderedTop=p.top-actualHeight;assert.equal(renderedTop+actualHeight,anchor.top-4);assert.ok(renderedTop>=8)}
})
test('keyboard shrink and visual viewport pan are reflected in available height and anchor',()=>{
 const anchor={top:610,bottom:658,left:24,width:342}
 const full=gamePanelPosition(anchor,view),keyboard=gamePanelPosition(anchor,{...view,top:300,height:400})
 assert.equal(keyboard.up,true);assert.ok(keyboard.height<full.height)
 assert.ok(keyboard.top-keyboard.height>=308);assert.ok(keyboard.top<=692)
 const offscreen=gamePanelPosition(anchor,{...view,top:100,height:350});assert.ok(offscreen.top<=442);assert.ok(offscreen.top-offscreen.height>=108)
})
test('narrow and horizontally panned viewports do not cause horizontal overflow',()=>{
 for(const width of [320,375,390,430]){
  const viewport={...view,left:17,width},p=gamePanelPosition({top:200,bottom:248,left:0,width:500},viewport)
  assert.ok(p.left>=25);assert.ok(p.left+p.width<=viewport.left+width-8);assert.ok(p.height>=0)
 }
})
