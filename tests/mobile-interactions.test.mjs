import test from 'node:test'
import assert from 'node:assert/strict'
import {createOptionPointer} from '../src/features/games/services/game-option-pointer.ts'
import {createSwipeNavigation} from '../src/features/shorts/services/mobile-navigation.ts'
const down=(patch={})=>({pointerId:1,pointerType:'touch',isPrimary:true,clientX:100,clientY:100,id:'game-correct-id',scrollTop:0,time:0,...patch})
test('touch/pen chooses the original ID before compatibility click; mouse and assistive clicks retain their path',()=>{
 for(const pointerType of ['touch','pen']){const tap=createOptionPointer();tap.start(down({pointerType}));assert.equal(tap.active,true);assert.equal(tap.end({...down(),time:200}),'game-correct-id');assert.equal(tap.active,false);assert.equal(tap.click(1),false);assert.equal(tap.click(0),true)}
 const mouse=createOptionPointer();mouse.start(down({pointerType:'mouse'}));assert.equal(mouse.end({...down(),time:100}),null);assert.equal(mouse.click(1),true)
})
test('scroll, pointer cancel, secondary finger and long press do not select or trigger the delayed click',()=>{
 for(const mode of ['pan','scroll','cancel','secondary','long']){const tap=createOptionPointer();tap.start(down());if(mode==='pan')tap.move({...down(),clientY:140});if(mode==='cancel')tap.cancel();if(mode==='secondary')tap.start(down({pointerId:2,isPrimary:false}));assert.equal(tap.end({...down(),scrollTop:mode==='scroll'?60:0,time:mode==='long'?900:200}),null,mode);assert.equal(tap.click(1),false)}
})
test('swipe directions need an intentional horizontal movement, preserve vertical intent and browser edge zones',()=>{
 for(const [x,expected]of [[20,1],[180,-1],[110,null]]){const swipe=createSwipeNavigation();swipe.start({...down(),viewportWidth:390});assert.equal(swipe.end({...down(),clientX:x,time:300}),expected)}
 for(const mode of ['vertical','cancel','mouse','edge','slow']){const swipe=createSwipeNavigation();swipe.start({...down({pointerType:mode==='mouse'?'mouse':'touch',clientX:mode==='edge'?10:100}),viewportWidth:390});if(mode==='vertical')swipe.move({...down(),clientX:105,clientY:150});if(mode==='cancel')swipe.cancel();assert.equal(swipe.end({...down(),clientX:200,clientY:mode==='vertical'?150:100,time:mode==='slow'?1500:300}),null,mode)}
})
