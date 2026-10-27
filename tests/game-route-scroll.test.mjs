import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import {saveFeedReturn,loadFeedReturn} from '../src/features/shorts/services/feed-return.ts'
const require=createRequire(import.meta.url)

// Exercise the actual route wrapper and its layout-effect registration, without
// mounting Firebase, querying the network or resolving the lazy game component.
function fixture(){
 const source=readFileSync(new URL('../src/features/games/pages/GamePage.tsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText
 const module={},effects=[],scroll=[];let id='igdb-1',key='entry-1',previous
 vm.runInNewContext(output,{exports:module,window:{scrollTo:options=>scroll.push({...options})},require:name=>{
  if(name==='react')return {...React,useLayoutEffect:(run,deps)=>{if(!previous||deps.some((value,index)=>value!==previous[index]))effects.push(run);previous=[...deps]}}
  if(name==='react/jsx-runtime')return require(name)
  if(name==='react-router-dom')return {useParams:()=>({gameId:id}),useLocation:()=>({key})}
  if(name.includes('firebase/mode'))return {usesFirestore:true}
  if(name.includes('fixtures'))return {games:[]}
  return {}
 }})
 return {scroll,effects,render:()=>module.GamePage(),flush:()=>{while(effects.length)effects.shift()()},
  change:(nextId,nextKey)=>{id=nextId;key=nextKey}}
}
test('game route resets scroll in layout phase while lazy loading fallback is still displayed',()=>{
 const f=fixture(),element=f.render()
 assert.equal(element.type,React.Suspense);assert.equal(element.props.fallback.props.role,'status')
 assert.equal(f.effects.length,1);assert.equal(f.scroll.length,0)
 f.flush();assert.deepEqual(f.scroll,[{top:0,behavior:'instant'}])
})
test('new game or same-game navigation key resets once; asynchronous rerenders do not repeatedly scroll',()=>{
 const f=fixture();f.render();f.flush();f.render();f.flush();assert.equal(f.scroll.length,1)
 f.change('igdb-2','entry-2');f.render();f.flush();assert.equal(f.scroll.length,2)
 f.change('igdb-2','entry-3');f.render();f.flush();assert.equal(f.scroll.length,3)
 f.render();f.flush();assert.equal(f.scroll.length,3)
})
test('entering game never clears or overwrites the home feed return snapshot',()=>{
 const saved={scroll:1850,filter:'igdb-1',index:2,order:'oldest'}
 saveFeedReturn('scroll-regression-home',saved)
 const f=fixture();f.render();f.flush()
 assert.equal(loadFeedReturn('scroll-regression-home'),saved)
 assert.equal(loadFeedReturn('scroll-regression-home').scroll,1850)
})
