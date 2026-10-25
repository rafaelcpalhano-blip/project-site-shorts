import test from 'node:test'
import assert from 'node:assert/strict'
import {gameCoverUrl} from '../src/lib/validation/game-cover.ts'
import {cardArtwork,createImageFailureCache} from '../src/features/shorts/services/card-artwork.ts'
import {publicShort} from '../server/public/read-content.ts'
const now=Date.now(),cover='https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg',url='https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'
const short={platform:'YouTube',identity:'YouTube:abcdefghijk',gameCoverUrl:cover,thumbnail:{url,obtainedAt:now-100,expiresAt:now+10000}}
test('miniatura oficial, capa validada e Clipper seguem prioridade, inclusive expiração',()=>{
 const failures=createImageFailureCache();assert.equal(cardArtwork(short,now,failures.has).kind,'thumbnail')
 failures.add(url);assert.equal(cardArtwork(short,now,failures.has).kind,'cover')
 failures.add(gameCoverUrl(cover));assert.equal(cardArtwork(short,now,failures.has).kind,'clipper')
 assert.equal(cardArtwork(short,now+20000,()=>false).kind,'cover')
 assert.equal(cardArtwork({...short,thumbnail:undefined,gameCoverUrl:undefined},now,()=>false).kind,'clipper')
 assert.equal(short.thumbnail.url,url)
})
test('falhas são lembradas entre cards/remontagens, com memória limitada',()=>{
 const failures=createImageFailureCache(2);failures.add('a');failures.add('b');assert.equal(failures.has('a'),true);failures.add('c');assert.equal(failures.has('a'),false);assert.equal(failures.has('b'),true)
})
test('capas recusam domínio falso, credenciais, porta, protocolo e caminhos arbitrários',()=>{
 assert.equal(gameCoverUrl(cover),cover.replace('t_cover_big/','t_cover_big_2x/'))
 for(const unsafe of [cover.replace('images.igdb.com','images.igdb.com.evil.test'),cover.replace('https:','http:'),cover.replace('images.igdb.com','u:p@images.igdb.com'),cover.replace('.com/','.com:8443/'),'javascript:alert(1)',cover.replace('abc.jpg','abc.svg'),cover+'\n'])assert.equal(gameCoverUrl(unsafe),undefined)
})
test('projeção pública reutiliza capa IGDB sem alterar título ou revelar campos privados',()=>{
 const data={platform:'YouTube',platformVideoId:'abcdefghijk',normalizedUrl:'https://www.youtube.com/shorts/abcdefghijk',title:'Título completo '+ 'jogada '.repeat(50),gameId:'portal',createdAt:new Date(now),moderationStatus:'published',likeCount:0}
 const game={officialName:'Portal',source:'IGDB',imageUrl:cover,private:'secret'}
 const result=publicShort('short',data,game);assert.equal(result.gameCoverUrl,gameCoverUrl(cover));assert.equal(result.title,data.title);assert.equal('private' in result,false)
 assert.equal(publicShort('short',data,{...game,source:'manual'}).gameCoverUrl,gameCoverUrl(cover))
 assert.equal(publicShort('short',data,{...game,imageUrl:'https://evil.test/a.png'}).gameCoverUrl,undefined)
})

test('capas autorizadas entram após miniatura oficial, e falha preserva Clipper',()=>{
 for(const image of [gameCoverUrl(cover),'/images/games/capa.png']){
  const item={...short,gameCoverUrl:image},failures=createImageFailureCache()
  assert.equal(cardArtwork(item,now,failures.has).kind,'thumbnail')
  failures.add(url);assert.deepEqual(cardArtwork(item,now,failures.has),{kind:'cover',url:image})
  failures.add(image);assert.equal(cardArtwork(item,now,failures.has).kind,'clipper')
 }
})
test('feed reaproveita capa manual atualizada do registro lido, sem mudar thumbnail ou expor metadados privados',()=>{
 const data={platform:'TikTok',platformVideoId:'123456789',normalizedUrl:'https://www.tiktok.com/@gamer/video/123456789',title:'Jogada',gameId:'manual-test',createdAt:new Date(now),moderationStatus:'published',likeCount:0}
 const game={officialName:'Jogo manual',source:'manual',imageUrl:null,private:'segredo',reviewVersion:1}
 assert.equal(cardArtwork(publicShort('short',data,game),now,()=>false).kind,'clipper')
 game.imageUrl='/images/games/capa.png'
 const refreshed=publicShort('short',data,game)
 assert.equal(refreshed.gameCoverUrl,game.imageUrl);assert.equal(cardArtwork(refreshed,now,()=>false).kind,'cover');assert.equal(refreshed.thumbnail,undefined);assert.equal(refreshed.private,undefined);assert.equal(refreshed.reviewVersion,undefined)
 for(const imageUrl of ['javascript:alert(1)','https://127.0.0.1/a.png','data:image/png;base64,x','https://images.example.org/a.svg','https://images.example.org/capa.png']){const result=publicShort('short',data,{...game,imageUrl});assert.equal(result.gameCoverUrl,undefined);assert.equal(cardArtwork(result,now,()=>false).kind,'clipper')}
 assert.equal(publicShort('short',data,{...game,source:'unknown'}).gameCoverUrl,undefined)
})
test('capa manual substituída não fica bloqueada pelo cache de falha da URL antiga',()=>{
 const failures=createImageFailureCache(),old='/images/games/old.png',updated='/images/games/new.png';failures.add(old)
 assert.equal(cardArtwork({...short,thumbnail:undefined,gameCoverUrl:old},now,failures.has).kind,'clipper')
 assert.deepEqual(cardArtwork({...short,thumbnail:undefined,gameCoverUrl:updated},now,failures.has),{kind:'cover',url:updated})
})
