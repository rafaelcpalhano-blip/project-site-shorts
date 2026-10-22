import test from 'node:test'
import assert from 'node:assert/strict'
import { createTikTokVerifier } from '../server/videos/tiktok.ts'
import { createMetadataVerifier } from '../server/videos/verify.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const input = { url: 'https://www.tiktok.com/@gamer/video/123456789?tracking=x', gameId: 'lol' }
const data = { type: 'video', version: '1.0', provider_name: 'TikTok', provider_url: 'https://www.tiktok.com', title: 'Jogada', html: '<script>untrusted()</script>', thumbnail_url: 'https://evil.example/image' }
test('TikTok consulta URL canônica no oEmbed oficial e retorna somente evidência textual', async () => {
  const calls = []
  const verify = createTikTokVerifier(async (url, options) => {
    calls.push({ url, options })
    return Response.json(data)
  })
  const result = await verify(input)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.origin + calls[0].url.pathname, 'https://www.tiktok.com/oembed')
  assert.equal(calls[0].url.searchParams.get('url'), 'https://www.tiktok.com/@gamer/video/123456789')
  assert.equal(calls[0].options.redirect, 'error')
  assert.ok(calls[0].options.signal)
  assert.equal(result.existence, 'confirmed')
  assert.equal(result.title, 'Jogada')
  assert.equal(result.shortFormat, 'unknown')
  assert.equal(result.formatPolicy, 'tiktok-platform-exception')
  assert.equal(decidePublication(result, 'TikTok').status, 'published')
  assert.ok(!JSON.stringify(result).includes('script'))
  assert.ok(!JSON.stringify(result).includes('evil.example'))
})
test('TikTok mantém respostas incompletas, falhas e conteúdo inacessível inconclusivos', async () => {
  for (const value of [null, {}, { ...data, type: 'rich' }, { ...data, provider_url: 'https://evil.example' }]) {
    assert.equal((await createTikTokVerifier(async () => Response.json(value))(input)).existence, 'unknown')
  }
  for (const status of [403, 404, 429, 500]) {
    assert.equal((await createTikTokVerifier(async () => new Response('', { status }))(input)).existence, 'unknown')
  }
  assert.equal((await createTikTokVerifier(async () => { throw new Error('timeout') })(input)).existence, 'unknown')
})
test('TikTok não consulta destinos arbitrários nem outras plataformas', async () => {
  let calls = 0
  const verify = createTikTokVerifier(async () => { calls++; return Response.json(data) })
  for (const url of ['https://evil.example/@gamer/video/123', 'https://clips.twitch.tv/Example']) await verify({ url })
  assert.equal(calls, 0)
})
test('roteador seleciona a URL e publica evidência técnica completa sem afirmar moderação audiovisual', async () => {
  const calls = []
  const evidence = { existence: 'confirmed', shortFormat: 'confirmed', gameMatch: 'confirmed', moderation: 'clear', flags: [] }
  const adapters = Object.fromEntries(['TikTok', 'YouTube', 'Twitch'].map(platform => [platform, async value => { calls.push({ platform, value }); return evidence }]))
  const verify = createMetadataVerifier(adapters)
  const result = await verify({ ...input, platform: 'Twitch' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].platform, 'TikTok')
  assert.equal(calls[0].value.url, 'https://www.tiktok.com/@gamer/video/123456789')
  assert.equal(calls[0].value.gameId, 'lol')
  assert.equal(result.moderation, 'unavailable')
  assert.equal(decidePublication(result).status, 'published')
})
test('roteador permite nova tentativa para adaptador ausente, erro ou URL inválida', async () => {
  for (const verify of [createMetadataVerifier({}), createMetadataVerifier({ TikTok: async () => { throw new Error('private') } })]) {
    assert.equal(decidePublication(await verify(input)).status, 'retry')
  }
  assert.equal(decidePublication(await createMetadataVerifier({})({ ...input, url: 'invalid' })).status, 'retry')
})


test('TikTok normaliza quebras de linha e NFC sem perder acentos, emoji ou pontuação',async()=>{
 for(const [title,expected]of [['  Olá 👾\r\nTíbia\t#jogada  ','Olá 👾 Tíbia #jogada'],['Vito\u0301ria!\u2028GG 🏆','Vitória! GG 🏆']]){
  const result=await createTikTokVerifier(async()=>Response.json({...data,title}))(input)
  assert.equal(result.title,expected);assert.equal(result.existence,'confirmed');assert.equal(decidePublication(result,'TikTok').status,'published')
 }
})

test('títulos ausentes, extensos e controles inseguros ficam opcionais sem truncamento ou título inventado',async()=>{
 for(const title of [undefined,null,'', '  ', 'x'.repeat(501), 'x'.repeat(4097),'bad\u0000title','bad\u000btitle','bad\u007ftitle']){
  const result=await createTikTokVerifier(async()=>Response.json({...data,title}))(input)
  assert.equal(result.title,undefined);assert.equal(result.existence,'confirmed');assert.equal(decidePublication(result,'TikTok').status,'published')
 }
})

test('resposta atual com iframe e sem título/miniatura não executa HTML nem rejeita identidade confirmada',async()=>{
 const actualShape={version:'1.0',type:'video',width:'100%',height:'100%',provider_name:'TikTok',provider_url:'https://www.tiktok.com/',embed_product_id:'123456789',embed_type:'video',html:'<iframe src="https://www.tiktok.com/player/v1/123456789"></iframe>'}
 const result=await createTikTokVerifier(async()=>Response.json(actualShape))(input)
 assert.equal(result.existence,'confirmed');assert.equal(result.title,undefined);assert.equal(result.thumbnailUrl,undefined);assert.ok(!JSON.stringify(result).includes('iframe'));assert.equal(decidePublication(result,'TikTok').status,'published')
})

test('links TikTok encurtados e URLs com credenciais não geram resolução de redirecionamentos',async()=>{
 let calls=0;const verify=createTikTokVerifier(async()=>{calls++;return Response.json(data)})
 for(const url of ['https://vm.tiktok.com/example/','https://vt.tiktok.com/example/','https://www.tiktok.com/t/example/','https://user:pass@www.tiktok.com/@gamer/video/123456789'])assert.equal((await verify({url})).existence,'unknown')
 assert.equal(calls,0)
})

test('descrição textual oficial é alternativa limitada; título utilizável tem prioridade',async()=>{
 const verify=payload=>createTikTokVerifier(async()=>Response.json({...data,...payload}))(input)
 assert.equal((await verify({title:'Título oficial',description:'Outra legenda'})).title,'Título oficial')
 for(const title of [undefined,'','x'.repeat(501)])assert.equal((await verify({title,description:'Legenda 🎮\n#Tíbia'})).title,'Legenda 🎮 #Tíbia')
 for(const description of [undefined,null,{},'x'.repeat(501),'x'.repeat(4097),'texto\u0000inválido'])assert.equal((await verify({title:undefined,description,html:'<p>Não extrair este texto</p>'})).title,undefined)
 assert.equal((await verify({title:undefined,description:'Texto',embed_product_id:'wrong'})).title,undefined)
})
