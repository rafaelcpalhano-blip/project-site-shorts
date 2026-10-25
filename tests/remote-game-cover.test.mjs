import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {Readable} from 'node:stream'
import {externalGameCoverUrl} from '../src/lib/validation/external-game-cover.ts'
import {createRemoteCoverInspector,isPublicCoverAddress,coverDimensions,readPinnedCover,coverLimits} from '../server/games/remote-cover.ts'
import {editManualGame} from '../server/games/edit-manual-game.ts'
import {createManualGame} from '../server/games/manual-game.ts'
import {nameStatePath} from '../server/games/name-keys.ts'
const url='https://cdn.example.org/capa.png',address={address:'1.1.1.1',family:4}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0JkAAAAASUVORK5CYII=','base64')
const valid=()=>({status:200,type:'image/png',body:png})
test('URLs aceitam domínios públicos variados e recusam esquemas, IPs, credenciais, portas e conteúdo ativo',()=>{
 for(const value of [url,'https://http2.mlstatic.com/D_NQ_NP_827505-MLB104802198232_012026-O.webp','https://images.example.org/image?id=10'])assert.equal(externalGameCoverUrl(value),value)
 for(const value of ['http://cdn.example.org/a.png','https://localhost/a.png','https://127.0.0.1/a.png','https://2130706433/a.png','https://[::1]/a.png','https://x.local/a.png','https://u:p@cdn.example.org/a.png','https://cdn.example.org:444/a.png','https://cdn.example.org/a.png#fragment','https://cdn.example.org/a.svg','data:image/png;base64,x','javascript:alert(1)','//cdn.example.org/a.png','https://cdn.example.org/\na.png','https://cdn.example.org/a\\b.png'])assert.equal(externalGameCoverUrl(value),undefined,value)
})
test('endereços não públicos, transição IPv6 e documentação são recusados',()=>{
 for(const ip of ['0.0.0.0','10.2.3.4','100.64.1.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.0.1','192.88.99.1','198.18.0.1','198.51.100.2','203.0.113.4','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1','64:ff9b::7f00:1','fe80::1','fc00::1','2001::1','2001:db8::1','2002:7f00:1::','3fff::1','not-ip'])assert.equal(isPublicCoverAddress(ip),false,ip)
 for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicCoverAddress(ip),true,ip)
})
test('DNS misto/privado/família incorreta é recusado sem conexão; IP aprovado é passado ao transporte',async()=>{
 for(const records of [[],[{address:'127.0.0.1',family:4}],[address,{address:'10.0.0.1',family:4}],[{...address,family:6}],Array(33).fill(address)]){let calls=0;await assert.rejects(createRemoteCoverInspector({resolve:async()=>records,read:async()=>{calls++;return valid()}})(url));assert.equal(calls,0)}
 let dns=0,reads=0
 const check=createRemoteCoverInspector({resolve:async host=>{dns++;assert.equal(host,'cdn.example.org');return[address]},read:async(target,pinned,signal)=>{reads++;assert.equal(target.href,url);assert.deepEqual(pinned,address);assert.equal(signal.aborted,false);return valid()}})
 assert.equal(await check(url),url);assert.equal(dns,1);assert.equal(reads,1)
})
test('redirecionamentos revalidam URL e DNS; destino final público é devolvido e loops são limitados',async()=>{
 const hosts=[],check=createRemoteCoverInspector({resolve:async host=>{hosts.push(host);return[address]},read:async target=>target.hostname==='cdn.example.org'?{status:302,location:'https://second.example.org/a.png',body:Buffer.alloc(0)}:valid()})
 assert.equal(await check(url),'https://second.example.org/a.png');assert.deepEqual(hosts,['cdn.example.org','second.example.org'])
 for(const destination of ['http://second.example.org/a.png','https://127.0.0.1/a.png','https://private.example.org/a.png','javascript:alert(1)']){let calls=0;await assert.rejects(createRemoteCoverInspector({resolve:async host=>host==='private.example.org'?[{address:'10.0.0.1',family:4}]:[address],read:async()=>{calls++;return{status:302,location:destination,body:Buffer.alloc(0)}}})(url));assert.equal(calls,1)}
 let reads=0;await assert.rejects(createRemoteCoverInspector({resolve:async()=>[address],read:async()=>{reads++;return {status:302,location:'/loop',body:Buffer.alloc(0)}}})(url));assert.equal(reads,coverLimits.redirects+1)
})
test('formato, assinatura, tamanho e dimensões são conferidos sem confiar na extensão',async()=>{
 assert.deepEqual(coverDimensions(png,'image/png'),{width:1,height:1})
 const oversized=Buffer.from(png);oversized.writeUInt32BE(2049,16)
 for(const result of [{status:200,type:'text/html',body:Buffer.from('<html>login</html>')},{status:200,type:'image/png',body:Buffer.from('<svg/>')},{status:200,type:'image/jpeg',body:png},{status:200,type:'image/png',body:oversized},{status:200,type:'image/png',body:Buffer.alloc(coverLimits.bytes+1)},{status:403,type:'image/png',body:png}])await assert.rejects(createRemoteCoverInspector({resolve:async()=>[address],read:async()=>result})(url))
 const webp=Buffer.alloc(30);webp.write('RIFF');webp.writeUInt32LE(22,4);webp.write('WEBP',8);webp.write('VP8X',12);webp.writeUIntLE(321,24,3);webp.writeUIntLE(499,27,3);assert.deepEqual(coverDimensions(webp,'image/webp'),{width:322,height:500})
 const jpeg=Buffer.from([255,216,255,192,0,8,8,1,244,1,66,3,255,217]);assert.deepEqual(coverDimensions(jpeg,'image/jpeg'),{width:322,height:500})
})
function transport(headers,chunks,status=200){let settings;const requester=(_url,options,callback)=>{settings=options;const req=new EventEmitter();req.end=()=>{const response=Readable.from(chunks);response.statusCode=status;response.headers=headers;callback(response)};return req};return{requester,settings:()=>settings}}
test('transporte fixa lookup/IP, SNI e TLS, sem proxy, cookies ou autorização',async()=>{
 const mock=transport({'content-type':'image/png','content-length':String(png.length)},[png]);const result=await readPinnedCover(new URL(url),address,new AbortController().signal,mock.requester)
 assert.equal(result.body.length,png.length);const options=mock.settings();assert.equal(options.agent,false);assert.equal(options.autoSelectFamily,false);assert.equal(options.servername,'cdn.example.org');assert.equal(options.rejectUnauthorized,true);assert.equal(options.maxHeaderSize,8192);assert.deepEqual(Object.keys(options.headers).sort(),['Accept','Accept-Encoding']);options.lookup('cdn.example.org',{},(error,ip,family)=>{assert.equal(error,null);assert.equal(ip,address.address);assert.equal(family,4)})
})
test('transporte recusa HTML, compressão, tamanho declarado ou recebido excessivo e respostas truncadas',async()=>{
 for(const [headers,chunks] of [[{'content-type':'text/html'},[png]],[{'content-type':'image/png','content-encoding':'gzip'},[png]],[{'content-type':'image/png','content-length':String(coverLimits.bytes+1)},[png]],[{'content-type':'image/png','content-length':'invalid'},[png]],[{'content-type':'image/png','content-length':String(png.length+1)},[png]],[{'content-type':'image/png'},[Buffer.alloc(coverLimits.bytes),Buffer.alloc(1)]]])await assert.rejects(readPinnedCover(new URL(url),address,new AbortController().signal,transport(headers,chunks).requester))
 const mock=transport({location:'/image'},[],302);assert.equal((await readPinnedCover(new URL(url),address,new AbortController().signal,mock.requester)).location,'/image')
})
test('DNS sem resposta termina pelo prazo sem iniciar transferência',async()=>{
 const keepAlive=setTimeout(()=>{},100)
 try{await assert.rejects(createRemoteCoverInspector({timeoutMs:5,resolve:()=>new Promise(()=>{}),read:async()=>assert.fail('não conectar')})(url))}finally{clearTimeout(keepAlive)}
})
function memory(){const docs=new Map([[nameStatePath,{version:1,ready:true}]]);return {docs,now:()=>new Date('2026-10-23T12:00:00Z'),store:{transact:async work=>{const writes=[];const result=await work({get:async path=>structuredClone(docs.get(path)??null),set:(p,d)=>writes.push([p,d]),create:(p,d)=>{assert.ok(!docs.has(p));writes.push([p,d])}});for(const [p,d]of writes)docs.set(p,d);return result}}}}
const metadata={name:'Jogo',description:'',imageUrl:url,releaseDate:null,genres:[],gameModes:[],platforms:[],aliases:[]}
test('domínio não autorizado é recusado antes de inspeção e não altera registro ou auditoria',async()=>{
 const deps=memory(),created=await createManualGame({name:'Jogo'},'a'.repeat(64),deps),id=created.game.id,input={id,revision:0,confirmed:true,reason:'Capa conferida pelo administrador',details:metadata},before=structuredClone(deps.docs.get('games/'+id));let calls=0
 await assert.rejects(editManualGame(input,'owner',{...deps,inspectCover:async()=>{calls++;return url}}),/invalid-input/)
 assert.equal(calls,0);assert.deepEqual(deps.docs.get('games/'+id),before);assert.equal([...deps.docs.values()].filter(row=>row.action==='edit-metadata').length,0)
})

test('mapeamento usa fallback para domínio pendente sem apagar a URL do registro',async()=>{
 const {mapGameDetails}=await import('../src/features/games/services/game-details.ts')
 const base={status:'active',officialName:'Jogo',description:'',genres:[],platforms:[]},legacy={...base,source:'manual',imageUrl:url}
 assert.equal(mapGameDetails('manual-test',legacy).imageUrl,null);assert.equal(legacy.imageUrl,url)
 assert.equal(mapGameDetails('igdb-1',{...base,source:'IGDB',imageUrl:url}).imageUrl,null)
 assert.equal(mapGameDetails('manual-test',{...base,source:'manual',imageUrl:'/images/games/capa.png'}).imageUrl,'/images/games/capa.png')
 assert.equal(mapGameDetails('igdb-1',{...base,source:'IGDB',imageUrl:'https://images.igdb.com/igdb/image/upload/t_thumb/test.jpg'}).imageUrl,'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/test.jpg')
})
