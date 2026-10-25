import {test} from 'node:test'
import assert from 'node:assert/strict'
import {schedulePublicationDismiss} from '../src/features/shorts/services/publication-notice.ts'

test('sucesso dura cinco segundos; cancelar/republicar não permite apagar aviso novo',context=>{
 context.mock.timers.enable({apis:['setTimeout']})
 let calls=0
 const cancel=schedulePublicationDismiss('Short publicado.',()=>calls++)
 context.mock.timers.tick(4999);assert.equal(calls,0);cancel();context.mock.timers.tick(1);assert.equal(calls,0)
 schedulePublicationDismiss('Short publicado.',()=>calls++);context.mock.timers.tick(4999);assert.equal(calls,0);context.mock.timers.tick(1);assert.equal(calls,1)
 context.mock.timers.tick(5000);assert.equal(calls,1)
})
test('erro e envio para revisão não expiram automaticamente',context=>{
 context.mock.timers.enable({apis:['setTimeout']});let calls=0
 schedulePublicationDismiss('Erro de envio',()=>calls++);schedulePublicationDismiss('Envio recebido para análise.',()=>calls++)
 context.mock.timers.tick(60000);assert.equal(calls,0)
})
