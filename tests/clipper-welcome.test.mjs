import test from 'node:test'
import assert from 'node:assert/strict'
import {createWelcomePreference,welcomeKey} from '../src/components/clipper/welcome-preference.ts'
test('boas-vindas persistem só após fechar, sem cookies ou identificação',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}
 const first=createWelcomePreference(); assert.equal(first.shouldShow(storage),true);assert.equal(data.size,0)
 first.dismiss(storage);assert.equal(first.shouldShow(storage),false);assert.equal(createWelcomePreference().shouldShow(storage),false)
 assert.deepEqual([...data],[[welcomeKey,'seen']]);data.clear();assert.equal(createWelcomePreference().shouldShow(storage),true)
})
test('armazenamento bloqueado ou ausente não interrompe nem repete boas-vindas na sessão',()=>{
 for(const storage of [undefined,{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}]){
 const preference=createWelcomePreference();assert.equal(preference.shouldShow(storage),true);preference.dismiss(storage);assert.equal(preference.shouldShow(storage),false)
 }
})
