import test from 'node:test'
import assert from 'node:assert/strict'
import {createAdminSession} from '../src/features/admin/services/admin-session.ts'
const time=1800000000000
const account=(uid='owner',expires=time+60000)=>({uid,getIdTokenResult:async()=>({token:'test-'+uid,expirationTime:new Date(expires).toISOString()})})
test('conexão sozinha não autoriza; servidor e UID correto são obrigatórios; navegar não recria sessão',async()=>{
 let calls=0;const session=createAdminSession(async token=>{calls++;assert.equal(token,'test-owner');return 'owner'},()=>time);session.setUser(account());assert.equal(session.getSnapshot().authorized,false);await Promise.all([session.verify(),session.verify()]);assert.equal(calls,1);assert.equal(session.getSnapshot().authorized,true)
 const unsubscribe=session.subscribe(()=>{});unsubscribe();assert.equal(session.getSnapshot().authorized,true);await session.verify();assert.equal(calls,1);session.dispose()
})
test('negação de MFA/UID/revogação e falha de rede nunca exibem autorização',async()=>{
 for(const check of [async()=>{throw Error('totp-required')},async()=>{throw Error('invalid-token')},async()=>{throw Error('auth-unavailable')},async()=>'other']){const session=createAdminSession(check,()=>time);session.setUser(account());await session.verify();assert.equal(session.getSnapshot().authorized,false);assert.ok(session.getSnapshot().error);session.dispose()}
})
test('expiração remove autorização sem conservar privilégio na interface',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let clock=time;const session=createAdminSession(async()=>'owner',()=>clock);session.setUser(account());await session.verify();clock+=60000;context.mock.timers.tick(60000);assert.equal(session.getSnapshot().authorized,false);assert.match(session.getSnapshot().error,/expirada/);session.dispose()
})
test('logout impede verificação atrasada e evento antigo do SDK de reabrir sessão',async()=>{
 let finish;const session=createAdminSession(()=>new Promise(resolve=>{finish=resolve}),()=>time);session.setUser(account());const verify=session.verify();await new Promise(resolve=>setImmediate(resolve));session.end();finish('owner');await verify;assert.equal(session.getSnapshot().user,null);assert.equal(session.getSnapshot().authorized,false);session.setUser(account());await session.verify();assert.equal(session.getSnapshot().user,null);session.dispose()
})
test('trocar identidade durante consulta não aplica autorização da conta anterior',async()=>{
 let finish;const session=createAdminSession(()=>new Promise(resolve=>{finish=resolve}),()=>time);session.setUser(account());const pending=session.verify();await new Promise(resolve=>setImmediate(resolve));session.setUser(account('other'));finish('owner');await pending;assert.equal(session.getSnapshot().user.uid,'other');assert.equal(session.getSnapshot().authorized,false);session.dispose()
})
test('invalidação após 401/403 e token expirado exigem nova verificação; sem escrita persistente',async()=>{
 const session=createAdminSession(async()=>'owner',()=>time);session.setUser(account());await session.verify();session.invalidate('Sessão revogada.');assert.equal(session.getSnapshot().authorized,false);assert.match(session.getSnapshot().error,/revogada/);session.end();session.beginSignIn();session.setUser(account('owner',time-1));await session.verify();assert.equal(session.getSnapshot().authorized,false);session.dispose()
})

test('retorno de aba verifica relógio mesmo se o timer de expiração foi atrasado',async()=>{
 let clock=time;const session=createAdminSession(async()=>'owner',()=>clock);session.setUser(account());await session.verify();clock+=60001;await session.verify();assert.equal(session.getSnapshot().authorized,false);assert.match(session.getSnapshot().error,/expirada/);session.dispose()
})
