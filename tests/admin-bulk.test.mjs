import test from 'node:test'
import assert from 'node:assert/strict'
import {bulkLimit,commonBulkActions,prepareBulkItem,runAdminBatch} from '../src/features/admin/services/admin-bulk.ts'
import {AdminRequestError} from '../src/features/admin/services/moderation-api.ts'
const user={getIdToken:async()=> 'test-token'},reason='Conferência administrativa dos registros'
const item=(n,actions=['game:hide'],apply=async()=>{})=>({key:'game:'+n,label:'Jogo '+n,kind:'game',actions,apply})
async function mock(data,work){const original=globalThis.fetch,calls=[];globalThis.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return typeof data==='function'?data(path,options):Response.json(data)};try{return await work(calls)}finally{globalThis.fetch=original}}
test('ações comuns respeitam estados mistos e tipos; não inventa transição',()=>{
 assert.deepEqual(commonBulkActions([item(1,['game:approve','game:hide','game:ban']),item(2,['game:restore','game:ban'])]),['game:ban'])
 assert.deepEqual(commonBulkActions([item(1),item(2,['game:unban'])]),[])
 assert.deepEqual(commonBulkActions([item(1),{...item(2),kind:'comment'}]),[])
 assert.deepEqual(commonBulkActions([]),[])
})
test('lote é sequencial, limitado a cinco e usa uma chamada por decisão',async()=>{
 let live=0,maximum=0;const calls=[],progress=[]
 const items=Array.from({length:bulkLimit},(_,n)=>item(n,undefined,async()=>{maximum=Math.max(maximum,++live);await Promise.resolve();calls.push(n);live--}))
 const result=await runAdminBatch(items,'game:hide',reason,()=>true,r=>progress.push(r.status))
 assert.deepEqual(calls,[0,1,2,3,4]);assert.equal(maximum,1);assert.ok(result.results.every(r=>r.status==='done'));assert.equal(progress.length,5)
})
test('falha parcial preserva concluídos, não repete e não inicia os demais',async()=>{
 const calls=[];const items=[0,1,2].map(n=>item(n,undefined,async()=>{calls.push(n);if(n===1)throw new AdminRequestError('O registro mudou.',false)}))
 const result=await runAdminBatch(items,'game:hide',reason)
 assert.deepEqual(calls,[0,1]);assert.deepEqual(result.results.map(r=>r.status),['done','failed','not-run']);assert.equal(result.unauthorized,false)
})
test('revogação, interrupção e resposta desconhecida param sem vazar erro ou repetir',async()=>{
 let calls=0;const result=await runAdminBatch([item(1,undefined,async()=>{throw new AdminRequestError('Acesso expirado',true)}),item(2,undefined,async()=>calls++)],'game:hide',reason)
 assert.equal(result.unauthorized,true);assert.equal(calls,0)
 let active=true;const interrupted=await runAdminBatch([item(1,undefined,async()=>{active=false}),item(2,undefined,async()=>calls++)],'game:hide',reason,()=>active);assert.deepEqual(interrupted.results.map(r=>r.status),['done','not-run']);assert.equal(calls,0)
 const uncertain=await runAdminBatch([item(1,undefined,async()=>{throw Error('secret token')})],'game:hide',reason);assert.ok(!JSON.stringify(uncertain).includes('secret'));assert.match(uncertain.results[0].message,/não confirmado/)
})
test('lote inválido é recusado antes de qualquer escrita',async()=>{
 for(const [items,action,text]of [[[],'game:hide',reason],[[item(1),item(1)],'game:hide',reason],[Array.from({length:6},(_,n)=>item(n)),'game:hide',reason],[[item(1)],'game:ban',reason],[[item(1)],'game:hide','x'],[[item(1)],'game:hide','motivo\nindevido']])await assert.rejects(runAdminBatch(items,action,text))
})
test('catálogo prepara revisão atual e envia estado individual sem aplicar resposta velha',async()=>{
 const data={game:{id:'g1',revision:3,status:'active'},actions:['hide','ban']}
 await mock((path)=>Response.json(path.endsWith('/detail')?data:{id:'g1'}),async calls=>{
  const candidate=await prepareBulkItem(user,{kind:'game',id:'g1',revision:3,status:'active',label:'Jogo'});assert.deepEqual(candidate.actions,['game:hide','game:ban']);await runAdminBatch([candidate],'game:hide',reason)
  assert.equal(calls[1].path,'/api/admin/games/moderate');assert.deepEqual(calls[1].body,{id:'g1',revision:3,action:'hide',reason,confirmed:true})
  await assert.rejects(prepareBulkItem(user,{kind:'game',id:'g1',revision:2,status:'active',label:'Jogo'}),/mudou/)
 })
})
test('solicitações usam nome próprio em cada aceite manual e nunca vinculam IGDB em lote',async()=>{
 await mock({},async calls=>{
  const candidates=await Promise.all(['Jogo Solar','Jogo Lunar'].map((name,n)=>prepareBulkItem(user,{kind:'request',id:String(n),label:name,revision:0,request:{id:String(n),name,status:'pending',revision:0}})))
  assert.deepEqual(candidates[0].actions,['request:create','request:reject']);await runAdminBatch(candidates,'request:create',reason)
  assert.deepEqual(calls.map(c=>c.body.name),['Jogo Solar','Jogo Lunar']);assert.ok(calls.every(c=>c.body.action==='create'&&!('gameId'in c.body)))
  await assert.rejects(prepareBulkItem(user,{kind:'request',id:'x',label:'Jogo',revision:0,request:{id:'x',name:'Jogo',revision:0,status:'linked'}}))
 })
})
test('comentários respeitam estado e disponibilidade do vídeo',async()=>{
 for(const [status,actions]of [['pending',['comment:approve','comment:reject']],['approved',['comment:remove']],['rejected',['comment:approve']],['removed',['comment:restore']]])await mock({comment:{id:'c',content:'Texto',revision:2,status},parent:{status:'published'}},async()=>{assert.deepEqual((await prepareBulkItem(user,{kind:'comment',id:'c',label:'Texto',revision:2,status})).actions,actions)})
 await mock({comment:{id:'c',content:'Texto',revision:2,status:'removed'},parent:{status:'removed'}},async()=>{assert.deepEqual((await prepareBulkItem(user,{kind:'comment',id:'c',label:'Texto',revision:2,status:'removed'})).actions,[])})
})
test('vídeos respeitam fila, denúncias e histórico seguro de restauração',async()=>{
 const data={short:{id:'v',title:'Vídeo',status:'published',revision:4,restoreStatus:null},count:2,reviewedCount:0}
 await mock((path)=>Response.json(path.endsWith('/detail')?data:{}),async calls=>{const candidate=await prepareBulkItem(user,{kind:'video',id:'v',label:'Vídeo',queue:'reports',count:2,reviewedCount:0});assert.deepEqual(candidate.actions,['video:dismiss','video:block','video:remove']);await runAdminBatch([candidate],'video:block',reason);assert.deepEqual(calls[1].body,{shortId:'v',revision:4,reportCount:2,action:'block',reason});await assert.rejects(prepareBulkItem(user,{kind:'video',id:'v',label:'Vídeo',queue:'reports',count:1}),/mudou/)})
 for(const restoreStatus of [null,'published','pending'])await mock({...data,short:{...data.short,status:'removed',restoreStatus}},async()=>{assert.deepEqual((await prepareBulkItem(user,{kind:'video',id:'v',label:'Vídeo',queue:'removed'})).actions,restoreStatus?['video:restore']:[])})
 await mock({...data,short:{...data.short,status:'pending'},count:0},async()=>{assert.deepEqual((await prepareBulkItem(user,{kind:'video',id:'v',label:'Vídeo',queue:'pending'})).actions,['video:approve','video:remove'])})
})
