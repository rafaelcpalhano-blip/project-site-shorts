import {test} from 'node:test'
import assert from 'node:assert/strict'
import {removeSelectedComments} from '../src/features/admin/services/remove-selected-comments.ts'
const items=Array.from({length:20},(_,index)=>({id:String(index),content:'Comentário '+index}))
test('exclusão sequencial reutiliza revisão atual e não repete transações',async()=>{
 const calls=[];const result=await removeSelectedComments(items,async id=>({...items[Number(id)],revision:3}),async item=>calls.push([item.id,item.revision]));assert.equal(result.error,null);assert.equal(result.removed.length,20);assert.deepEqual(calls,items.map(item=>[item.id,3]))
})
test('falha parcial mantém apenas exclusões confirmadas e interrompe restantes',async()=>{
 const reads=[],writes=[];const failure=Error('Muitas operações');const result=await removeSelectedComments(items,async id=>{reads.push(id);return items[Number(id)]},async item=>{if(item.id==='2')throw failure;writes.push(item.id)});assert.deepEqual(result.removed,['0','1']);assert.equal(result.error,failure);assert.deepEqual(reads,['0','1','2']);assert.deepEqual(writes,['0','1'])
})
test('mudança no conteúdo ou identidade impede exclusão',async()=>{
 for(const current of [{...items[0],content:'Alterado'},{...items[0],id:'outro'}]){let writes=0;const result=await removeSelectedComments([items[0]],async()=>current,async()=>writes++);assert.equal(writes,0);assert.equal(result.removed.length,0);assert.ok(result.error)}
})
test('seleções vazias, duplicadas ou acima da página são recusadas antes de ler',async()=>{
 for(const selection of [[],[items[0],items[0]],[...items, {id:'21',content:'extra'}]])await assert.rejects(()=>removeSelectedComments(selection,async()=>assert.fail(),async()=>assert.fail()))
})
test('desmontagem durante leitura impede iniciar escrita',async()=>{
 let active=true,writes=0;const result=await removeSelectedComments([items[0]],async()=>{active=false;return items[0]},async()=>writes++,()=>active);assert.equal(writes,0);assert.equal(result.removed.length,0);assert.ok(result.error)
})
test('autorização revogada encerra lote sem tentar os demais comentários',async()=>{
 const failure=Object.assign(Error('Acesso expirado'),{status:401});let reads=0;const result=await removeSelectedComments(items,async()=>{reads++;throw failure},async()=>assert.fail());assert.equal(reads,1);assert.equal(result.error,failure);assert.deepEqual(result.removed,[])
})
