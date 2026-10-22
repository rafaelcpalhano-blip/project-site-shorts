import test from 'node:test'
import assert from 'node:assert/strict'
import {thumbnailUrl,validThumbnail,thumbnailLifetimeMs} from '../src/lib/validation/thumbnail.ts'
import {createThumbnail,readThumbnail} from '../server/videos/thumbnail.ts'
import {createYouTubeVerifier,createYouTubeOEmbedVerifier} from '../server/videos/youtube.ts'
import {createTikTokVerifier} from '../server/videos/tiktok.ts'
import {createTwitchClipVerifier} from '../server/videos/twitch.ts'
import {decidePublication} from '../server/submissions/decision.ts'
import {submitShort} from '../server/submissions/submit-short.ts'
import {refreshThumbnails} from '../server/videos/refresh-thumbnails.ts'
import {publicShort} from '../server/public/read-content.ts'
import {createPublicReadClient} from '../src/lib/firebase/public-read-api.ts'
import {createOrderedFeedClient} from '../src/features/shorts/services/ordered-feed-api.ts'
const yt='https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',tw='https://clips-media-assets2.twitch.tv/clip-preview-480x272.jpg',tt='https://p16-sign-va.tiktokcdn.com/image.jpeg',at=new Date(),now=()=>new Date(at),visitor='a'.repeat(64)
const evidence={existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]}
function memory(){const docs=new Map([['games/game',{officialName:'Jogo',status:'active'}]]),stats={writes:0,calls:0};const store={get:async p=>structuredClone(docs.get(p)??null),scanShorts:async after=>[...docs].filter(([p])=>p.startsWith('shorts/')&&(!after||p.slice(7)>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([p,data])=>({id:p.slice(7),data:structuredClone(data)})),transact:async work=>{const writes=[];const result=await work({get:async p=>{assert.equal(writes.length,0);return structuredClone(docs.get(p)??null)},create:(p,d)=>{assert.ok(!docs.has(p));writes.push([p,d])},set:(p,d)=>writes.push([p,d])});for(const[p,d]of writes){docs.set(p,d);stats.writes++}return result}};return {store,docs,stats,now,checkAbuse:async()=>{},verify:async()=>{stats.calls++;return {...evidence,thumbnailUrl:tw}}}}
const short={normalizedUrl:'https://clips.twitch.tv/ExampleClip',platform:'Twitch',platformVideoId:'ExampleClip',title:'Jogada',channelName:'Canal',gameId:'game',createdAt:at,moderationStatus:'published',likeCount:0}
test('URLs de miniaturas validam parser, domínio, protocolo e identidade YouTube',()=>{
 for(const [url,p,id]of [[yt,'YouTube','YouTube:abcdefghijk'],[tw,'Twitch','Twitch:ExampleClip'],[tt,'TikTok','TikTok:123']])assert.equal(thumbnailUrl(url,p,id),url)
 for(const url of ['javascript:alert(1)','data:image/svg+xml,test','http://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg','https://i.ytimg.com.evil.test/vi/abcdefghijk/hqdefault.jpg','https://evil.test/?image='+yt,'https://user:pass@i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',yt+'#fragment',yt.replace('abcdefghijk','other'),yt.replace('hqdefault.jpg','x.svg'),'https://i.ytimg.com:8443/vi/abcdefghijk/hqdefault.jpg',yt+'\n'])assert.equal(thumbnailUrl(url,'YouTube','YouTube:abcdefghijk'),undefined,url)
 for(const url of ['https://tiktokcdn.com.evil.test/p.jpg','https://notmuscdn.com/p.jpg','https://127.0.0.1/p.jpg','https://cloudfront.net/p.jpg'])assert.equal(thumbnailUrl(url,'TikTok','TikTok:123'),undefined)
})
test('validade é limitada a sete dias; expiração assinada mais curta prevalece sem inventar duração',()=>{
 const image=createThumbnail(tt+'?x-expires='+Math.floor(at.getTime()/1000+60),'TikTok','TikTok:123',at);assert.ok(image.expiresAt.getTime()-at.getTime()<=60000);assert.ok(readThumbnail(image,'TikTok','TikTok:123',at.getTime()));assert.equal(readThumbnail(image,'TikTok','TikTok:123',image.expiresAt.getTime()),undefined)
 const dto={url:yt,obtainedAt:at.getTime(),expiresAt:at.getTime()+thumbnailLifetimeMs};assert.ok(validThumbnail(dto,'YouTube','YouTube:abcdefghijk',at.getTime()));for(const patch of [{obtainedAt:at.getTime()+2000},{expiresAt:at.getTime()},{expiresAt:at.getTime()+thumbnailLifetimeMs+1},{url:'https://evil.test/p.jpg'}])assert.equal(validThumbnail({...dto,...patch},'YouTube','YouTube:abcdefghijk',at.getTime()),undefined)
 assert.equal(createThumbnail(tt+'?x-expires=1','TikTok','TikTok:123',at),undefined)
})
test('YouTube reaproveita uma consulta e escolhe a melhor imagem válida da identidade correta',async()=>{
 let calls=0;const item={id:'abcdefghijk',snippet:{title:'Jogada',thumbnails:{maxres:{url:'https://evil.test/p.jpg'},high:{url:yt}}},status:{privacyStatus:'public',uploadStatus:'processed',embeddable:true},contentDetails:{duration:'PT1M'}}
 const verify=createYouTubeVerifier({apiKey:'test-key',fetcher:async url=>{calls++;assert.ok(url.searchParams.get('fields').includes('thumbnails'));return Response.json({items:[item]})}}),result=await verify({url:'https://www.youtube.com/shorts/abcdefghijk'});assert.equal(calls,1);assert.equal(result.thumbnailUrl,yt);assert.equal(decidePublication(result,'YouTube').status,'published');item.snippet.thumbnails.high.url='https://evil.test/p.jpg';const fallback=await verify({url:'https://www.youtube.com/shorts/abcdefghijk'});assert.equal(fallback.thumbnailUrl,undefined);assert.equal(decidePublication(fallback,'YouTube').status,'published')
})
test('TikTok/Twitch aceitam apenas imagem oficial dos metadados confirmados, sem executar HTML',async()=>{
 let calls=0;const tik=createTikTokVerifier(async()=>{calls++;return Response.json({type:'video',version:'1.0',provider_name:'TikTok',provider_url:'https://www.tiktok.com',thumbnail_url:tt,html:'<script>evil()</script>'})}),t=await tik({url:'https://www.tiktok.com/@gamer/video/123456789'});assert.equal(t.thumbnailUrl,tt);assert.equal(t.shortFormat,'unknown');assert.equal(decidePublication(t,'TikTok').status,'published');assert.equal(calls,1);assert.ok(!JSON.stringify(t).includes('<script>'))
 const twitch=createTwitchClipVerifier({clientId:'test',accessToken:async()=>'test-token',fetcher:async()=>Response.json({data:[{id:'ExampleClip',duration:15,thumbnail_url:tw}]})});assert.equal((await twitch({url:'https://clips.twitch.tv/ExampleClip',gameId:'game'})).thumbnailUrl,tw)
})
test('publicação persiste imagem opcional sem mudar cota/duplicatas nem aceitar metadado do visitante',async()=>{
 const d=memory(),input=i=>({url:'https://clips.twitch.tv/ExampleClip'+i,title:'Jogada',gameId:'game'});for(let i=0;i<5;i++){const r=await submitShort(input(i),visitor,d),row=d.docs.get('shorts/'+r.id);assert.equal(row.thumbnail.url,tw);assert.equal(row.thumbnail.obtainedAt.getTime(),at.getTime());assert.equal(row.moderationStatus,'published')}
 await assert.rejects(submitShort(input(5),visitor,d),e=>e.code==='daily-limit');await assert.rejects(submitShort(input(0),visitor,d),e=>e.code==='duplicate-video');await assert.rejects(submitShort({...input(6),thumbnail:{url:yt}},visitor,d));const other=memory();other.verify=async()=>({...evidence,thumbnailUrl:'https://evil.test/p.jpg'});const r=await submitShort(input(6),visitor,other);assert.equal(other.docs.get('shorts/'+r.id).thumbnail,undefined)
})
test('leitura pública omite miniatura inválida/expirada sem derrubar feed nem vazar campos',()=>{
 const game={officialName:'Jogo'},image=createThumbnail(tw,'Twitch','Twitch:ExampleClip',at),row=publicShort('s1',{...short,thumbnail:image,privateField:'secret'},game);assert.equal(row.thumbnail.url,tw);assert.equal(row.privateField,undefined)
 for(const thumbnail of [{...image,url:'https://evil.test/p.jpg'},{...image,expiresAt:new Date(0)},null])assert.equal(publicShort('s1',{...short,thumbnail},game).thumbnail,undefined)
})
test('manutenção consulta um lote limitado e é idempotente; nunca altera outros metadados',async()=>{
 const d=memory();d.docs.set('shorts/s1',{...short,reviewVersion:9});const before=structuredClone(d.docs.get('shorts/s1'));assert.equal((await refreshThumbnails(d)).eligible,1);assert.equal(d.stats.calls,0);assert.equal(d.stats.writes,0);assert.equal((await refreshThumbnails({...d,apply:true})).refreshed,1);const {thumbnail,...rest}=d.docs.get('shorts/s1');assert.deepEqual(rest,before);assert.equal(thumbnail.url,tw);const count=d.stats.calls;await refreshThumbnails({...d,apply:true});assert.equal(d.stats.calls,count)
})
test('falha de metadados descarta somente imagem vencida; concorrência com remoção não restaura vídeo',async()=>{
 const d=memory();d.docs.set('shorts/s1',{...short,thumbnail:{url:tw,obtainedAt:new Date(0),expiresAt:new Date(1)}});d.verify=async()=>{throw Error('provider-timeout')};assert.equal((await refreshThumbnails({...d,apply:true})).discarded,1);assert.deepEqual(d.docs.get('shorts/s1'),short)
 d.verify=async()=>{d.docs.get('shorts/s1').moderationStatus='removed';return {...evidence,thumbnailUrl:tw}};assert.equal((await refreshThumbnails({...d,apply:true})).conflicts,1);assert.equal(d.docs.get('shorts/s1').moderationStatus,'removed');assert.equal(d.docs.get('shorts/s1').thumbnail,undefined)
})
test('clientes removem imagem forjada mas mantêm o vídeo válido e a paginação',async()=>{
 const row=publicShort('s1',short,{officialName:'Jogo'});row.thumbnail={url:'https://evil.test/p.jpg',obtainedAt:Date.now(),expiresAt:Date.now()+1000};const page={items:[row],next:null,limited:false,candidatesRead:1,candidatesExamined:1,order:'latest',orderingAt:new Date().toISOString()},fetcher=async path=>path==='/api/session'?new Response(null,{status:204}):Response.json(page)
 assert.equal((await createPublicReadClient(fetcher).listShorts()).items[0].thumbnail,undefined);assert.equal((await createOrderedFeedClient(fetcher)('latest')).items[0].thumbnail,undefined)
})

test('oEmbed YouTube fornece miniatura opcional sem passar a autorizar publicação',async()=>{
 const verify=createYouTubeOEmbedVerifier(async()=>Response.json({type:'video',provider_name:'YouTube',provider_url:'https://www.youtube.com',title:'Jogada',thumbnail_url:yt})),result=await verify({url:'https://www.youtube.com/shorts/abcdefghijk'});assert.equal(result.thumbnailUrl,yt);assert.equal(result.shortFormat,'unknown');assert.equal(decidePublication(result,'YouTube').status,'retry')
})
test('manutenção respeita trinta candidatos e cursor sem percorrer a coleção inteira',async()=>{
 const d=memory();for(let i=0;i<31;i++)d.docs.set('shorts/s'+String(i).padStart(2,'0'),{...short});const first=await refreshThumbnails(d);assert.equal(first.examined,30);assert.ok(first.next);const second=await refreshThumbnails({...d,after:first.next});assert.equal(second.examined,1);assert.equal(second.next,null);assert.equal(d.stats.calls,0);assert.equal(d.stats.writes,0)
})
