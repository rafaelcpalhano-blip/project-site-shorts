import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
let server,filter,Combo
before(async()=>{server=await createServer({cacheDir:'node_modules/.cache/game-combobox',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false});filter=(await server.ssrLoadModule('/src/features/games/services/game-options.ts')).filterGameOptions;Combo=(await server.ssrLoadModule('/src/features/games/components/GameCombobox.tsx')).GameCombobox})
after(async()=>server?.close())
const games=[{id:'z',name:'Zelda'},{id:'a',name:'Água'},{id:'b',name:'banana'},{id:'p',name:'Pokémon'},{id:'c',name:'Counter-Strike 2'}]
test('pesquisa parcial ignora capitalização e acentos, sem mudar nomes nem IDs',()=>{
 assert.deepEqual(filter(games,'POKEMON'),[{id:'p',name:'Pokémon'}]);assert.deepEqual(filter(games,'ágUA'),[{id:'a',name:'Água'}]);assert.deepEqual(filter(games,'strIKE'),[{id:'c',name:'Counter-Strike 2'}]);assert.deepEqual(filter(games,'inexistente'),[])
})
test('ordem pt-BR e deduplicação por ID mantêm a lista inteira, além de seis/dez jogos',()=>{
 assert.deepEqual(filter(games,'').map(g=>g.id),['a','b','c','p','z']);const many=Array.from({length:120},(_,i)=>({id:String(i),name:'Jogo '+i}));assert.equal(filter([...many,...many],'').length,120);assert.equal(filter(many,'Jogo 119')[0].id,'119');assert.equal(many.length,120)
})
test('controle recolhido, label e seleção obrigatória pelo ID, sem lista aberta',()=>{
 const html=render(h(Combo,{games,value:'p',onChange(){}}));assert.match(html,/aria-haspopup="listbox"/);assert.match(html,/aria-expanded="false"/);assert.match(html,/>Pokémon<\/span>/);assert.match(html,/<select[^>]*hidden=""[^>]*required=""/);assert.match(html,/<option value="p" selected="">Pokémon/);assert.doesNotMatch(html,/role="listbox"/)
 const empty=render(h(Combo,{games,value:'',onChange(){}}));assert.match(empty,/Selecione um jogo/);const disabled=render(h(Combo,{games,value:'p',onChange(){},disabled:true}));assert.match(disabled,/<button[^>]*disabled=""/)
})
