import test from 'node:test'
import assert from 'node:assert/strict'
import {relativeTime} from '../src/lib/relative-time.ts'
import {supportEmailForDisplay,supportContact} from '../src/config/support.ts'
import {scheduleAutoCollapse} from '../src/features/games/services/auto-collapse.ts'
const minute=60000,hour=60*minute,day=24*hour,now=1800000000000

test('tempo relativo usa intervalos completos nos limites de minutos, horas, dias e meses',()=>{
 const samples=[[0,'agora'],[minute-1,'agora'],[minute,'há 1 minuto'],[12*minute,'há 12 minutos'],[60*minute-1,'há 59 minutos'],[hour,'há 1 hora'],[24*hour-1,'há 23 horas'],[day,'há 1 dia'],[30*day-1,'há 29 dias'],[30*day,'há 1 mês'],[60*day-1,'há 1 mês'],[60*day,'há 2 meses'],[365*day,'há 12 meses'],[720*day,'há 24 meses']]
 for(const [age,label]of samples)assert.equal(relativeTime(now-age,now),label)
})
test('tempo relativo não muda no calendário e trata horários futuros/inválidos sem negativos',()=>{
 const current=Date.parse('2026-02-01T00:00:00Z'),recent=Date.parse('2026-01-31T23:00:00Z');assert.equal(relativeTime(recent,current),'há 1 hora');assert.equal(relativeTime(now+day,now),'agora')
 for(const value of [NaN,Infinity,-1,Number.MAX_SAFE_INTEGER,'invalid'])assert.equal(relativeTime(value,now),'Data indisponível')
 for(const clock of [NaN,Infinity,-1,Number.MAX_SAFE_INTEGER])assert.equal(relativeTime(now,clock),'Data indisponível')
 assert.equal(relativeTime(0,0),'agora')
})
test('contato provisório aparece em desenvolvimento e nunca como canal operacional em produção',()=>{
 assert.equal(supportEmailForDisplay(true),supportContact.email);assert.equal(supportEmailForDisplay(false),undefined)
 assert.equal(supportEmailForDisplay(false,{email:supportContact.email,operational:true}),undefined)
 assert.equal(supportEmailForDisplay(false,{email:'suporte@example.org',operational:false}),undefined)
 assert.equal(supportEmailForDisplay(false,{email:'suporte@example.org',operational:true}),'suporte@example.org')
})
test('recolhimento ocorre uma vez após 1,5 segundo',context=>{
 context.mock.timers.enable({apis:['setTimeout']});let open=true,calls=0
 scheduleAutoCollapse(()=>{open=false;calls++});context.mock.timers.tick(1499);assert.equal(open,true);context.mock.timers.tick(1);assert.equal(open,false);assert.equal(calls,1);context.mock.timers.tick(5000);assert.equal(calls,1)
})
test('nova ação ou desmontagem cancela o fechamento sem callback tardio',context=>{
 context.mock.timers.enable({apis:['setTimeout']});let calls=0;const cancel=scheduleAutoCollapse(()=>calls++);context.mock.timers.tick(1000);cancel();cancel();context.mock.timers.tick(10000);assert.equal(calls,0)
 const unmount=scheduleAutoCollapse(()=>calls++);unmount();context.mock.timers.tick(5000);assert.equal(calls,0)
})

test('callback já enfileirado permanece inerte após cancelamento',context=>{
 let callback,clears=0,closed=false
 context.mock.method(globalThis,'setTimeout',fn=>{callback=fn;return 123})
 context.mock.method(globalThis,'clearTimeout',()=>{clears++})
 const cancel=scheduleAutoCollapse(()=>{closed=true});cancel();callback();assert.equal(closed,false);assert.equal(clears,1)
})
