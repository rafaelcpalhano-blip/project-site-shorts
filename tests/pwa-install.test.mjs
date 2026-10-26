import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createInstallController, manualInstallMode} from '../src/components/pwa/install-controller.ts'
const android = {userAgent:'Mozilla Android Chrome/130 Mobile',maxTouchPoints:5}
function fixture(nav=android, settings={}) {
 const win=new EventTarget(), standalone=new EventTarget(), coarse=new EventTarget(), storage=new Map()
 standalone.matches=Boolean(settings.standalone); coarse.matches=settings.coarse!==false
 win.matchMedia=query=>query.includes('standalone')?standalone:coarse
 win.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}
 const controller=createInstallController(win,nav); controller.start()
 let prompts=0
 const offer=(outcome='dismissed',fail=false)=>{
  const event=new Event('beforeinstallprompt',{cancelable:true})
  event.prompt=async()=>{prompts++;if(fail)throw Error('unavailable')}
  event.userChoice=Promise.resolve({outcome}); win.dispatchEvent(event); return event
 }
 return {win,standalone,coarse,storage,controller,offer,prompts:()=>prompts}
}
test('mobile detection requires touch capabilities and compatible platform, not window width',()=>{
 assert.equal(manualInstallMode(android,true),'android')
 for(const nav of [{...android,maxTouchPoints:0},{...android,userAgentData:{mobile:false}},{...android,userAgent:'Windows Chrome/130'},{...android,userAgent:android.userAgent+'; wv)'},{...android,userAgent:android.userAgent+' Instagram'}])assert.equal(manualInstallMode(nav,true),'hidden')
 assert.equal(manualInstallMode(android,false),'hidden')
 assert.equal(manualInstallMode({userAgent:'iPhone Safari',maxTouchPoints:5},true),'ios')
 assert.equal(manualInstallMode({userAgent:'Macintosh Safari',maxTouchPoints:5},true),'ios')
})
test('native offer is captured early but never prompts before explicit request; event consumed once',async()=>{
 const f=fixture();const event=f.offer();assert.equal(event.defaultPrevented,true);assert.equal(f.prompts(),0);assert.equal(f.controller.getSnapshot(),'native')
 assert.equal(await f.controller.request(),'done');assert.equal(f.prompts(),1);assert.equal(f.controller.getSnapshot(),'android')
 assert.equal(await f.controller.request(),'guide');assert.equal(f.prompts(),1);f.controller.stop()
})
test('accepted install hides invitation and remembers only installation time; new browser offer enables reinstall',async()=>{
 const f=fixture();f.offer('accepted');await f.controller.request();assert.equal(f.controller.getSnapshot(),'hidden');assert.equal(f.storage.size,1)
 const second=createInstallController(f.win,android);second.start();assert.equal(second.getSnapshot(),'hidden')
 f.offer();assert.equal(second.getSnapshot(),'native');assert.equal(f.storage.size,0)
 f.controller.stop();second.stop()
})
test('appinstalled and standalone changes hide invitation; iOS standalone also hides',()=>{
 const f=fixture();f.win.dispatchEvent(new Event('appinstalled'));assert.equal(f.controller.getSnapshot(),'hidden');f.controller.stop()
 const g=fixture();g.standalone.matches=true;g.standalone.dispatchEvent(new Event('change'));assert.equal(g.controller.getSnapshot(),'hidden');g.controller.stop()
 const h=fixture({...android,standalone:true});assert.equal(h.controller.getSnapshot(),'hidden');h.controller.stop()
})
test('unsupported desktop does not intercept install event or show mobile instructions',async()=>{
 const f=fixture({userAgent:'Windows Chrome',maxTouchPoints:0});assert.equal(f.offer().defaultPrevented,false);assert.equal(await f.controller.request(),'done');assert.equal(f.prompts(),0);f.controller.stop()
})
test('cancel stays quiet, failed native prompt offers manual guide, storage denial is harmless',async()=>{
 const f=fixture();f.win.localStorage={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}}
 const other=createInstallController(f.win,android);other.start()
 f.offer('dismissed',true);assert.equal(await f.controller.request(),'guide')
 f.offer('accepted');assert.equal(await f.controller.request(),'done');assert.equal(f.controller.getSnapshot(),'hidden');other.stop();f.controller.stop()
})
test('repeated taps cannot prompt twice while native prompt is pending',async()=>{
 const f=fixture();const event=new Event('beforeinstallprompt',{cancelable:true});let finish,count=0
 event.prompt=async()=>{count++};event.userChoice=new Promise(resolve=>{finish=resolve});f.win.dispatchEvent(event)
 const first=f.controller.request();assert.equal(await f.controller.request(),'done');assert.equal(count,1)
 finish({outcome:'dismissed'});await first;f.controller.stop()
})
test('PWA manifest uses same-origin standalone routes and real PNG icon dimensions; no SW caching added',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'))
 assert.equal(manifest.name,'Clipzone');assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone')
 for(const icon of manifest.icons){assert.ok(icon.src.startsWith('/icons/'));const bytes=await readFile(new URL('../public'+icon.src,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size)}
 const main=await readFile(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(main.includes("import './components/pwa/install-controller'"));assert.equal(main.includes('serviceWorker.register'),false)
})
