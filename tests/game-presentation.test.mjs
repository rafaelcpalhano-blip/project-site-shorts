import test from 'node:test'
import assert from 'node:assert/strict'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
import {gameLabel} from '../src/features/games/services/game-labels.ts'
const data={officialName:'Portal',status:'active',source:'IGDB',imageUrl:'https://images.igdb.com/igdb/image/upload/t_thumb/co123.jpg'}
test('capas antigas usam tamanho oficial maior sem trocar identidade ou confiar em host externo',()=>{
 assert.equal(mapGameDetails('igdb-71',data).imageUrl,'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co123.jpg')
 assert.equal(mapGameDetails('id',{...data,imageUrl:data.imageUrl.replace('t_thumb','t_cover_big_2x')}).imageUrl,mapGameDetails('id',data).imageUrl)
 for(const imageUrl of [data.imageUrl.replace('images.igdb.com','images.igdb.com.evil.test'),data.imageUrl.replace('https:','http:'),data.imageUrl.replace('co123.jpg','nested/a.jpg'),data.imageUrl.replace('co123.jpg','a.svg')])assert.equal(mapGameDetails('id',{...data,imageUrl}).imageUrl,null)
})
test('vocabulário pt-BR não inventa tradução de nomes próprios, termos novos ou propriedades herdadas',()=>{
 assert.equal(gameLabel('Adventure','genre'),'Aventura')
 assert.equal(gameLabel('Single player','mode'),'Um jogador')
 assert.equal(gameLabel('Co-operative','mode'),'Cooperativo')
 assert.equal(gameLabel('PC (Microsoft Windows)','platform'),'PC (Windows)')
 for(const value of ['PlayStation 5','Novo termo','constructor','toString'])assert.equal(gameLabel(value,'genre'),value)
})
