import test from 'node:test'
import assert from 'node:assert/strict'
import {manualGameCoverUrl,validateManualGameDetails} from '../src/lib/validation/manual-game-details.ts'
import {gameCoverUrl} from '../src/lib/validation/game-cover.ts'
const igdb='https://images.igdb.com/igdb/image/upload/t_thumb/fixture.jpg'
test('somente caminhos locais seguros e host/caminho IGDB exatos são aceitos',()=>{
 for(const extension of ['png','jpg','jpeg','webp'])assert.equal(manualGameCoverUrl('/images/games/capa-1_2.'+extension),'/images/games/capa-1_2.'+extension)
 assert.equal(manualGameCoverUrl(igdb),igdb.replace('t_thumb','t_cover_big_2x'))
 for(const value of ['/images/games/../a.png','/images/games/%2e%2e/a.png','/images/games/sub/a.png','/images/games/a.png?x=1','/images/games/a.png#x','/images/games/a.png\n','/images/games/a.svg','//other.org/a.png','https://cdn.example.org/a.png','https://clipzone.test/images/games/a.png'])assert.equal(manualGameCoverUrl(value),undefined,value)
})
test('IGDB recusa protocolo, hostname falso, credenciais, query, fragmento e caminhos fora do formato',()=>{
 for(const value of [igdb.replace('https:','http:'),igdb.replace('images.igdb.com','images.igdb.com.evil.org'),igdb.replace('images.igdb.com','other.igdb.com'),igdb.replace('images.igdb.com','user@images.igdb.com'),igdb.replace('.com/','.com:8443/'),igdb+'?redirect=https://evil.org',igdb+'#x',igdb.replace('fixture.jpg','fixture.svg'),igdb.replace('/t_thumb/','/other/'),igdb.replace('https://','https:\\'),igdb+'\n'])assert.equal(gameCoverUrl(value),undefined,value)
})
test('edição valida fonte sem mudar os demais campos ou aceitar conteúdo arbitrário',()=>{
 const data={name:'Jogo',description:'Descrição',imageUrl:'/images/games/a.png',releaseDate:null,genres:[],gameModes:[],platforms:[],aliases:[]}
 assert.deepEqual(validateManualGameDetails(data),data)
 assert.throws(()=>validateManualGameDetails({...data,imageUrl:'https://cdn.example.org/a.png'}),/invalid-input/)
 assert.equal(data.imageUrl,'/images/games/a.png')
})
