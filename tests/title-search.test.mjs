import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeTitle,titleSearchFields} from '../src/lib/validation/title-search.ts'
import {parseSearch,searchTitles} from '../server/search/search-titles.ts'
import {handleTitleSearch} from '../server/http/title-search.ts'
import {createTitleSearchClient} from '../src/features/shorts/services/title-search-api.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {backfillTitlePage} from '../server/search/backfill-titles.ts'
const origin='https://clipzone.test',visitor='a'.repeat(64)
const make=(n,title,patch={})=>({id:'s'+String(n).padStart(3,'0'),data:{title,...titleSearchFields(title),moderationStatus:'published',platform:'Twitch',platformVideoId:'Clip'+n,normalizedUrl:'https://clips.twitch.tv/Clip'+n,gameId:'portal',channelName:'Canal',createdAt:new Date(1700000000000+n*1000),...patch}})
function memory(rows=[]){const docs=new Map([['searchState/title-v1',{ready:true}],...rows.map(r=>['shorts/'+r.id,r.data])]);let reads=0,tail=Promise.resolve()
 const store={transact(work){const result=tail.then(async()=>{const writes=new Map();const result=await work({get:async path=>structuredClone(docs.get(path)??null),set:(path,value)=>writes.set(path,value),create:(path,value)=>writes.set(path,value)});for(const [p,v] of writes)docs.set(p,v);return result});tail=result.catch(()=>{});return result},
  async searchShorts(q){assert.ok(q.limit<=30);let rows=[...docs].filter(([p,d])=>p.startsWith('shorts/')&&d.moderationStatus==='published'&&d.searchFragments?.includes(q.fragment)&&(!q.gameId||d.gameId===q.gameId)).map(([p,data])=>({id:p.split('/')[1],data})).sort((a,b)=>b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id));if(q.cursor)rows=rows.filter(r=>r.data.createdAt.toISOString()<q.cursor.time||r.data.createdAt.toISOString()===q.cursor.time&&r.id<q.cursor.id);rows=rows.slice(0,q.limit);reads+=rows.length;return structuredClone(rows)},
  async scanShorts(after){return [...docs].filter(([p])=>p.startsWith('shorts/')&&(!after||p.slice(7)>after)).sort(([a],[b])=>a.localeCompare(b)).slice(0,30).map(([p,data])=>({id:p.slice(7),data}))}}
 return {store,docs,getReads:()=>reads}
}
const post=(body,headers={})=>new Request(origin+'/api/shorts/search',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})
test('normalização e fragmentos encontram início/meio/fim, acentos, caixa, espaços e emoji sem crescimento quadrático',()=>{
 const title='Ótima VIRADA no Portal 🎮',fields=titleSearchFields(title)
 for(const term of ['ótima','VIRADA','Portal','🎮']){const q=normalizeTitle(term);assert.ok(fields.searchFragments.includes([...q].slice(0,3).join('')));assert.ok(normalizeTitle(title).includes(q))}
 assert.equal(normalizeTitle('  AÇÃO   ÉPICA  '),'acao epica')
 assert.ok(titleSearchFields('x'.repeat(500)).searchFragments.length<=1497)
 const expanded=titleSearchFields('각'.repeat(500));assert.ok(expanded.searchFragments.length<=4497)
 assert.throws(()=>titleSearchFields('x'.repeat(501)))
})
test('consulta valida cursor vinculado a termo/jogo/ordem e rejeita campos privilegiados',()=>{
 const cursor={time:new Date(1700000000000).toISOString(),id:'s001',query:'portal',gameId:null,order:'recent'}
 assert.equal(parseSearch({query:'PÓRTAL',cursor}).cursor.id,'s001')
 for(const input of [{query:''},{query:'x'.repeat(501)},{query:'abc',limit:300},{query:'abc',order:'relevance'},{query:'abc',gameId:'../private'},{query:'portal',cursor:{...cursor,id:'../private'}},{query:'outra',cursor},{query:'portal',gameId:'tibia',cursor}])assert.throws(()=>parseSearch(input))
})
test('busca é global por trecho real, filtra jogos/estados e preserva cronologia',async()=>{
 const {store}=memory([make(1,'Começo ação fim'),make(2,'Um meio de AÇÃO agora'),make(3,'AÇÃO final',{gameId:'tibia'}),make(4,'ação invisível',{moderationStatus:'pending'}),make(5,'ação removida',{moderationStatus:'removed'})])
 const page=await searchTitles({query:'ação',gameId:'portal'},store)
 assert.deepEqual(page.items.map(r=>r.id),['s002','s001']);assert.equal(page.next,null)
 assert.equal((await searchTitles({query:'começo'},store)).items.length,1)
 assert.equal((await searchTitles({query:'fim'},store)).items.length,1)
})
test('termo comum consulta no máximo 30 e pagina em 15 sem perder candidatos já buscados',async()=>{
 const {store,getReads}=memory(Array.from({length:46},(_,n)=>make(n,'Jogada comum '+n)))
 let cursor,all=[]
 do{const before=getReads(),page=await searchTitles({query:'jogada',...(cursor?{cursor}:{})},store);assert.ok(getReads()-before<=30);assert.ok(page.items.length<=15);all.push(...page.items.map(r=>r.id));cursor=page.next}while(cursor)
 assert.equal(all.length,46);assert.equal(new Set(all).size,46);assert.equal(all[0],'s045');assert.equal(all.at(-1),'s000')
})
test('lote de 30 falsos positivos fica vazio mas continua; lote exato admite chamada final vazia',async()=>{
 const rows=[make(0,'Minha virada')];for(let n=1;n<=30;n++)rows.push(make(n,'Minha vitória'))
 const {store}=memory(rows),first=await searchTitles({query:'minha virada'},store)
 assert.equal(first.items.length,0);assert.equal(first.candidatesRead,30);assert.equal(first.candidatesExamined,30);assert.equal(first.limited,true);assert.ok(first.next)
 const second=await searchTitles({query:'minha virada',cursor:first.next},store);assert.equal(second.items[0].id,'s000');assert.equal(second.next,null)
 const empty=memory(rows.slice(1));const one=await searchTitles({query:'minha virada'},empty.store),two=await searchTitles({query:'minha virada',cursor:one.next},empty.store)
 assert.equal(one.exhausted,false);assert.equal(two.exhausted,true);assert.equal(two.items.length,0)
})
test('cursores com datas iguais não repetem e remoção entre páginas é respeitada',async()=>{
 const {store,docs}=memory(Array.from({length:20},(_,n)=>make(n,'Jogo legal',{createdAt:new Date(1700000000000)})))
 const first=await searchTitles({query:'legal'},store);assert.equal(first.items.length,15)
 docs.get('shorts/s003').moderationStatus='removed'
 const second=await searchTitles({query:'legal',cursor:first.next},store)
 assert.equal(second.items.length,4);assert.ok(!second.items.some(r=>r.id==='s003'));assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,19)
})
test('backfill revalida registro atual, mantém moderação/dados e é idempotente; pesquisa exige prontidão',async()=>{
 const {store,docs}=memory();docs.set('shorts/old',{title:'Título antigo',moderationStatus:'removed',extra:'keep'})
 const originalScan=store.scanShorts;store.scanShorts=async after=>{const rows=await originalScan(after);docs.get('shorts/old').title='Título recente';return rows}
 const result=await backfillTitlePage(store);assert.ok(docs.get('shorts/old').searchFragments.includes('rec'));assert.equal(result.updated,1);assert.equal((await backfillTitlePage(store)).updated,0)
 assert.equal(docs.get('shorts/old').moderationStatus,'removed');assert.equal(docs.get('shorts/old').extra,'keep')
 docs.delete('searchState/title-v1');await assert.rejects(searchTitles({query:'antigo'},store),/search-preparing/)
})
test('API exige origem/sessão, limita corpo e falha sem vazar dados internos',async()=>{
 const {store}=memory([make(0,'Teste')]),deps={store,origin,resolveVisitor:async()=>visitor,checkAbuse:async()=>{}}
 assert.equal((await handleTitleSearch(post({query:'teste'}),deps)).status,200)
 assert.equal((await handleTitleSearch(post({query:'teste'},{origin:'https://evil.test'}),deps)).status,403)
 assert.equal((await handleTitleSearch(post({query:'teste'}),{...deps,resolveVisitor:async()=>null})).status,401)
 assert.equal((await handleTitleSearch(post('x'.repeat(8193)),deps)).status,413)
 const failure=await handleTitleSearch(post({query:'teste'}),{...deps,store:{...store,searchShorts:async()=>{throw new Error('secret')}}})
 assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('secret'))
})
test('cliente reutiliza sessão, valida resposta, permite cancelamento e não repete falhas',async()=>{
 const data=await searchTitles({query:'teste'},memory([make(0,'Teste')]).store),calls=[]
 const client=createTitleSearchClient(async(path,init)=>{calls.push({path,init});return Response.json(path==='/api/session'?{}:data)})
 const abort=new AbortController();assert.equal((await client({query:'teste'},abort.signal)).items.length,1);assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1].init.body),{query:'teste'});assert.ok(calls[1].init.signal)
 let attempts=0;const bad=createTitleSearchClient(async path=>{attempts++;return path==='/api/session'?Response.json({}):Response.json({error:'secret'},{status:503})})
 await assert.rejects(bad({query:'teste'}),/Não foi possível/);assert.equal(attempts,2)
 const forged=createTitleSearchClient(async path=>Response.json(path==='/api/session'?{}:{...data,candidatesRead:31}));await assert.rejects(forged({query:'teste'}),/inválida/)
})
test('composição aplica limite de pesquisa próprio sem consumir submissões',async()=>{
 const {store,docs}=memory([make(0,'Teste')]),api=await createPublicApi({titleSearchEnabled:true,origin,store,now:()=>new Date(),visitorSecret:'ab'.repeat(32),maximumAttempts:1,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}})
 const session=await api(new Request(origin+'/api/session',{method:'POST',headers:{origin}})),cookie=session.headers.get('set-cookie').split(';')[0]
 assert.equal((await api(post({query:'teste'},{cookie}))).status,200);assert.equal((await api(post({query:'teste'},{cookie}))).status,429)
 assert.ok(docs.has('titleSearchAttempts/'+[...docs.keys()].find(p=>p.startsWith('titleSearchAttempts/')).split('/')[1]))
 assert.ok(![...docs.keys()].some(p=>p.startsWith('submissionLimits/')||p.startsWith('submissionAttempts/')))
})
