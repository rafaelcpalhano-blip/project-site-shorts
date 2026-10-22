import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
let server,Card,Source,Information,Report,Like,Content,Context
before(async()=>{
 server=await createServer({cacheDir:'node_modules/.cache/refinements-b',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',clearScreen:false})
 const load=path=>server.ssrLoadModule('/src/features/'+path)
 Card=(await load('shorts/components/ShortCard.tsx')).ShortCard
 const info=await load('players/components/PlayerInformation.tsx');Source=info.VideoSourceLink;Information=info.PlayerInformation
 Report=(await load('reports/ReportForm.tsx')).ReportForm;Like=(await load('likes/components/LikeButton.tsx')).LikeButton
 Content=(await load('shorts/components/FirestoreShortDialog.tsx')).FirestoreShortContent
 Context=(await load('admin/context/admin-session-context.ts')).AdminContext
})
after(async()=>server?.close())
const short={id:'video',identity:'YouTube:abcdefghijk',url:'https://www.youtube.com/shorts/abcdefghijk',platform:'YouTube',title:'Jogada especial',channelName:'Canal teste',gameId:'game',createdAt:Date.now(),likeCount:7}
test('card separa canal e horário e apresenta curtidas antes de comentários',()=>{
 const html=render(h(MemoryRouter,null,h(Card,{short,gameName:'Jogo teste',onOpen:()=>{}})))
 assert.match(html,/aria-label="Abrir vídeo: Jogada especial"/)
 assert.doesNotMatch(html,/>Abrir vídeo</)
 assert.match(html,/Canal teste<\/p><p[^>]*><time/)
 const positions=['Jogo teste','Jogada especial</span></button>','Canal teste','<time','7 curtidas','Comentários','Ver jogo'].map(text=>html.indexOf(text))
 assert.ok(positions.every((value,index)=>value>=0&&(!index||value>positions[index-1])))
})
test('fonte externa conserva URL canônica e rejeita links inseguros',()=>{
 assert.ok(render(h(Source,{short})).includes('href="https://www.youtube.com/shorts/abcdefghijk"'))
 assert.match(render(h(Source,{short})),/rel="noopener noreferrer"/)
 for(const url of ['javascript:alert(1)','https://evil.test/shorts/abcdefghijk']){
  assert.equal(render(h(Source,{short:{...short,url}})),'')
  assert.equal(render(h(Information,{short:{...short,url}})),'')
 }
 assert.match(render(h(Information,{short})),/<details><summary>Sobre a reprodução em YouTube/)
})
test('denúncia desabilitada e curtidas sem moldura mantêm semântica',()=>{
 assert.match(render(h(Report,{shortId:short.id,disabled:true,onBusyChange:()=>{}})),/disabled=""[^>]*>Denunciar vídeo/)
 const html=render(h(Like,{shortId:short.id,onCountChange:()=>{},onBusyChange:()=>{}}))
 assert.doesNotMatch(html,/fieldset|class="inset"/);assert.match(html,/role="status"/)
})
test('avisos ficam após comentários; fonte permanece disponível durante carregamento',()=>{
 const html=render(h(Context.Provider,{value:{user:null,authorized:false}},h(Content,{short,onLikeCount:()=>{},onModerated:()=>{},onBusyChange:()=>{}})))
 assert.ok(html.indexOf('Assistir na plataforma')<html.indexOf('Comentários publicados'))
 assert.ok(html.indexOf('Sobre a reprodução')>html.indexOf('Atualizar comentários'))
 assert.doesNotMatch(html,/<fieldset|<iframe/)
})
