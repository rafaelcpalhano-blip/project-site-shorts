import test from 'node:test'
import assert from 'node:assert/strict'
import {nextCommentNumber,commentNumber,prepareCommentNumbers} from '../server/comments/comment-number.ts'
import {publicCursor} from '../src/lib/validation/public-read.ts'
test('sequência recusa valores inválidos, overflow e histórico ainda não preparado',async()=>{
 for(const value of [0,-1,1.5,NaN,'1'])assert.throws(()=>commentNumber(value),/invalid-comment-number/)
 assert.equal(commentNumber(undefined),undefined);assert.equal(commentNumber(1),1)
 for(const value of [-1,'2',Number.MAX_SAFE_INTEGER])await assert.rejects(nextCommentNumber({},'short',{lastCommentNumber:value}),/invalid-comment-sequence/)
 await assert.rejects(nextCommentNumber({},'short',{hasPublishedComments:true}),/comment-numbering-preparing/);assert.equal(await nextCommentNumber({},'short',{lastCommentNumber:10}),11)
})
test('preparação limita histórico sem gravar nem renumerar sequência existente',async()=>{
 let writes=0;const tx={get:async()=>({}),publishedCommentHistory:async()=>Array.from({length:201},()=>({})),set(){writes++}},store={transact:work=>work(tx)}
 await assert.rejects(prepareCommentNumbers('short',store,true),/history-limit-200/);assert.equal(writes,0)
 tx.get=async()=>({lastCommentNumber:8});tx.publishedCommentHistory=()=>assert.fail('no re-scan');assert.equal((await prepareCommentNumbers('short',store,true)).lastNumber,8);assert.equal(writes,0)
})
test('cursor por número é validado e vinculado ao short; feed não aceita número de comentário',()=>{
 const cursor={id:'one',time:'2026-10-22T12:00:00.000Z',scope:'comments:short',number:7};assert.deepEqual(publicCursor(cursor,cursor.scope),cursor)
 for(const data of [{...cursor,number:0},{...cursor,number:'7'},{...cursor,scope:'comments:other'},{...cursor,private:true}])assert.throws(()=>publicCursor(data,cursor.scope),/invalid-input/)
 assert.throws(()=>publicCursor({...cursor,scope:'shorts:*'},'shorts:*'),/invalid-input/)
})
