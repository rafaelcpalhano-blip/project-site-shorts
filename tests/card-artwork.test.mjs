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
 assert.equal(publicShort('short',data,{...game,source:'manual'}).gameCoverUrl,undefined)
 assert.equal(publicShort('short',data,{...game,imageUrl:'https://evil.test/a.png'}).gameCoverUrl,undefined)
})
