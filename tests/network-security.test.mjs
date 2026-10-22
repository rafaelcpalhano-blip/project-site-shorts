import test from 'node:test'
import assert from 'node:assert/strict'
import {createNetworkProtection,networkLimits} from '../server/security/network-abuse.ts'
import {networkAddress} from '../server/security/network-address.ts'
import {cleanupNetworkAbuse} from '../server/security/network-retention.ts'
import {createPublicApi} from '../server/http/public-api.ts'
import {shortLike,likePath} from '../server/likes/short-likes.ts'
import {submitShort} from '../server/submissions/submit-short.ts'
const origin='https://clipzone.test',ip='203.0.113.10',secret='ab'.repeat(32),visitor='a'.repeat(64),shortId='s1'
function memory(){
 const records=new Map([['games/game',{officialName:'Game',status:'active'}],['shorts/'+shortId,{gameId:'game',moderationStatus:'published',likeCount:0}]]);let tail=Promise.resolve()
 const store={get:async path=>structuredClone(records.get(path)??null),transact(work){const result=tail.then(async()=>{const writes=new Map();const value=await work({get:store.get,set:(path,data)=>writes.set(path,structuredClone(data)),create:(path,data)=>{assert.ok(!records.has(path)&&!writes.has(path));writes.set(path,structuredClone(data))},delete:path=>writes.set(path,null)});for(const [path,data]of writes)if(data===null)records.delete(path);else records.set(path,data);return value});tail=result.catch(()=>{});return result},expiredNetworkRecords:async now=>[...records].filter(([p,d])=>p.startsWith('networkAbuse/')&&d.expiresAt<=now).map(([p,data])=>({id:p.split('/')[1],data:structuredClone(data)})).slice(0,30)}
 return {records,store}
}
function clock(){let time=new Date('2026-10-22T12:00:00Z').getTime();return {now:()=>new Date(time),advance:ms=>{time+=ms}}}
const req=(path,body={},cookie='',headers={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify(body)})
const contribution=records=>[...records.values()].find(row=>row.scope==='contributions')

test('rede normaliza IPv4 mapeado e IPv6 /64, recusa cabeçalhos e valores não IP',()=>{
 assert.equal(networkAddress(ip),ip);assert.equal(networkAddress('::ffff:203.0.113.10'),ip);assert.equal(networkAddress('::ffff:cb00:710a'),ip)
 assert.equal(networkAddress('2001:db8:abcd:12::1'),networkAddress('2001:0db8:abcd:0012:ffff:0:0:2'))
 assert.notEqual(networkAddress('2001:db8:abcd:13::1'),networkAddress('2001:db8:abcd:12::1'))
 for(const bad of [undefined,'',ip+', 127.0.0.1','https://example.test','unknown','fe80::1%eth0'])assert.throws(()=>networkAddress(bad))
})

test('sessões têm limites persistidos por janela/dia e sinal HMAC muda por finalidade e dia',async()=>{
 const {records,store}=memory(),time=clock(),guard=await createNetworkProtection({store,secret,now:time.now})
 for(let window=0;window<5;window++){for(let i=0;i<8;i++)await guard.attempt(ip,'sessions');await assert.rejects(guard.attempt(ip,'sessions'),/abuse-limit/);time.advance(600001)}
 await assert.rejects(guard.attempt(ip,'sessions'),/abuse-limit/)
 const restarted=await createNetworkProtection({store,secret,now:time.now});await assert.rejects(restarted.attempt(ip,'sessions'),/abuse-limit/)
 await guard.attempt(ip,'like-attempts');assert.equal([...records.keys()].filter(p=>p.startsWith('networkAbuse/')).length,2)
 assert.ok(!JSON.stringify([...records]).includes(ip));assert.ok(!JSON.stringify([...records]).includes(secret))
 time.advance(86400000);await guard.attempt(ip,'sessions');assert.equal([...records.keys()].filter(p=>p.startsWith('networkAbuse/')).length,3)
})

test('cookies apagados não apagam o orçamento de novas sessões; cabeçalhos de IP não burlam o transporte',async()=>{
 const {records,store}=memory(),time=clock(),api=await createPublicApi({origin,store,now:time.now,visitorSecret:'cd'.repeat(32),network:{secret},maximumAttempts:100,attemptWindowMs:60000,allowSessionIssuance:async()=>true,verify:async()=>{}})
 let cookie
 for(let i=0;i<8;i++){const response=await api(req('/api/session',{},'',{'x-forwarded-for':'198.51.100.'+i,'cf-connecting-ip':'198.51.100.'+i}),{clientAddress:ip});assert.equal(response.status,204);cookie=response.headers.get('set-cookie').split(';')[0]}
 assert.equal((await api(req('/api/session'),{clientAddress:ip})).status,429)
 assert.equal((await api(req('/api/session',{},cookie),{clientAddress:ip})).status,204)
 assert.equal((await api(req('/api/session',{},'',{'cf-connecting-ip':ip}))).status,503)
 assert.equal((await api(req('/api/session'),{clientAddress:'203.0.113.11'})).status,204)
 assert.ok(!JSON.stringify([...records]).includes(ip))
})

test('rede compartilhada aceita pessoas distintas, limita novas curtidas e preserva desfazer/recurtir',async()=>{
 const {records,store}=memory(),time=clock(),guard=await createNetworkProtection({store,secret,now:time.now}),options={store,now:time.now,prepareNetworkLike:(tx,id)=>guard.prepareContribution(tx,ip,'like',id)}
 const identities=Array.from({length:21},(_,i)=>(i+1).toString(16).padStart(64,'0'))
 const results=await Promise.all(identities.map(id=>shortLike({shortId,liked:true,revision:0},id,options,true).then(()=>true,()=>false)))
 assert.equal(results.filter(Boolean).length,networkLimits.newLikesPerVideoPerDay);assert.equal(records.get('shorts/'+shortId).likeCount,20)
 const path=await likePath(shortId,identities[0]);assert.equal(records.get(path).liked,true)
 await shortLike({shortId,liked:true,revision:0},identities[0],options,true);assert.equal(contribution(records).likes,20)
 await shortLike({shortId,liked:false,revision:1},identities[0],options,true);assert.equal(records.get('shorts/'+shortId).likeCount,19)
 await shortLike({shortId,liked:true,revision:2},identities[0],options,true);assert.equal(records.get('shorts/'+shortId).likeCount,20);assert.equal(contribution(records).likes,20)
 await shortLike({shortId,liked:true,revision:0},identities[20],{...options,prepareNetworkLike:(tx,id)=>guard.prepareContribution(tx,'203.0.113.11','like',id)},true);assert.equal(records.get('shorts/'+shortId).likeCount,21)
})

test('cinco publicações por identidade e limite adicional de rede sobrevivem a novas identidades sem consumir recusas',async()=>{
 const {records,store}=memory(),time=clock(),guard=await createNetworkProtection({store,secret,now:time.now})
 const options={store,now:time.now,checkAbuse:async()=>{},verify:async()=>({existence:'confirmed',shortFormat:'confirmed',gameMatch:'unknown',moderation:'unavailable',flags:[]}),prepareNetworkPublication:tx=>guard.prepareContribution(tx,ip,'publication')}
 const input=n=>({url:'https://clips.twitch.tv/NetworkClip'+n,gameId:'game',title:'Boa jogada'})
 const first=await Promise.all(Array.from({length:7},(_,i)=>submitShort(input(i),visitor,options).then(()=>true,()=>false)))
 assert.equal(first.filter(Boolean).length,5);assert.equal(contribution(records).publications,5)
 await assert.rejects(submitShort(input(20),visitor,{...options,verify:async()=>({existence:'unknown',shortFormat:'unknown',gameMatch:'unknown',moderation:'unavailable',flags:[]})}),/verification-incomplete/);assert.equal(contribution(records).publications,5)
 let serial=30
 for(let who=1;who<=5;who++)for(let i=0;i<5;i++)await submitShort(input(serial++),String(who).repeat(64),options)
 assert.equal(contribution(records).publications,30)
 await assert.rejects(submitShort(input(serial++),'f'.repeat(64),options),/abuse-limit/)
 assert.equal([...records.keys()].filter(p=>p.startsWith('videoIdentities/')).length,30)
 assert.ok(!records.has('submissionLimits/'+'f'.repeat(64)+'-2026-10-22'))
 time.advance(86400000);await submitShort(input(serial++),visitor,options);assert.equal(records.get('submissionLimits/'+visitor+'-2026-10-23').count,1)
})

test('tentativas continuam limitadas ao trocar a sessão e registros corruptos falham fechados',async()=>{
 const {records,store}=memory(),time=clock(),guard=await createNetworkProtection({store,secret,now:time.now})
 for(let i=0;i<20;i++)await guard.attempt(ip,'submission-attempts')
 await assert.rejects(guard.attempt(ip,'submission-attempts'),/abuse-limit/)
 time.advance(60001);await guard.attempt(ip,'submission-attempts')
 const data=[...records.values()].find(d=>d.scope==='submission-attempts');data.total=-1
 await assert.rejects(guard.attempt(ip,'submission-attempts'),/invalid-network-record/)
})

test('retenção remove até 30 expirados e relê antes de excluir sem apagar contribuições/curtidas',async()=>{
 const {records,store}=memory(),time=clock()
 for(let i=0;i<35;i++)records.set('networkAbuse/'+i.toString(16).padStart(64,'0'),{expiresAt:new Date(time.now().getTime()-1)})
 records.set('networkAbuse/'+'f'.repeat(64),{expiresAt:new Date(time.now().getTime()+1)})
 let result=await cleanupNetworkAbuse({store,now:time.now});assert.equal(result.deleted,30);assert.equal(result.more,true)
 const scan=store.expiredNetworkRecords;store.expiredNetworkRecords=async now=>{const rows=await scan(now);records.get('networkAbuse/'+rows[0].id).expiresAt=new Date(now.getTime()+1);return rows}
 result=await cleanupNetworkAbuse({store,now:time.now});assert.equal(result.deleted,4);assert.equal(result.more,false);assert.equal(records.get('shorts/'+shortId).likeCount,0)
})


test('segredos locais permanecem estáveis após reinício, são separados por finalidade e arquivo corrompido não é substituído',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path'),{localSecuritySecrets}=await import('../scripts/local-security.mjs')
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'clipzone-security-')),file=path.join(dir,'secrets.local')
 try{const a=await localSecuritySecrets(file),b=await localSecuritySecrets(file);assert.deepEqual(a,b);assert.notEqual(a.visitor,a.network);assert.match(a.visitor,/^[a-f0-9]{64}$/)
  const {createVisitorIdentity}=await import('../server/security/visitor-identity.ts'),first=await createVisitorIdentity(a.visitor),restarted=await createVisitorIdentity(b.visitor),issued=await first.issue(),request=new Request(origin,{headers:{Cookie:issued.split(';')[0]}});assert.equal(await first.resolveVisitor(request),await restarted.resolveVisitor(request))
  await fs.writeFile(file,'invalid');await assert.rejects(localSecuritySecrets(file),/invalid-local-security-secrets/);assert.equal(await fs.readFile(file,'utf8'),'invalid')
 }finally{await fs.rm(dir,{recursive:true,force:true})}
})


test('orçamento diário de novas curtidas limita cardinalidade e não renova ao alternar vídeos',async()=>{
 const {records,store}=memory(),time=clock(),guard=await createNetworkProtection({store,secret,now:time.now})
 for(let i=0;i<networkLimits.newLikesPerDay;i++)await store.transact(async tx=>{const apply=await guard.prepareContribution(tx,ip,'like','short'+i);apply()})
 assert.equal(Object.keys(contribution(records).videoLikes).length,200)
 await assert.rejects(store.transact(async tx=>{const apply=await guard.prepareContribution(tx,ip,'like','new-short');apply()}),/abuse-limit/)
 assert.equal(contribution(records).likes,200)
})

test('orçamento de rede muda à meia-noite de São Paulo, sem depender do relógio do navegador',async()=>{
 const {records,store}=memory(),time=clock();time.advance(-9*3600000-1000)
 const guard=await createNetworkProtection({store,secret,now:time.now});await guard.attempt(ip,'sessions');assert.equal([...records.values()].find(v=>v.scope==='sessions').day,'2026-10-21')
 time.advance(2000);await guard.attempt(ip,'sessions');assert.deepEqual([...records.values()].filter(v=>v.scope==='sessions').map(v=>v.day).sort(),['2026-10-21','2026-10-22'])
})
