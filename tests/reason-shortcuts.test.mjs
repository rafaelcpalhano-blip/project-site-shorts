import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyReason, formatReason, toggleReason, editReason, hasMixedReasons, reasonOptions } from '../src/features/admin/services/reason-shortcuts.ts'

test('seleção múltipla usa separador correto, sem repetir atalhos e sem alterar observações', () => {
  let draft = { ...emptyReason(), freeText: 'Observação manual, com detalhes adicionais.' }
  draft = toggleReason(toggleReason(draft, 'related'), 'game')
  assert.equal(formatReason(draft), 'Reconheço como jogo, Assunto relacionado a jogos, Observação manual, com detalhes adicionais.')
  draft = toggleReason(draft, 'game')
  assert.equal(formatReason(draft), 'Assunto relacionado a jogos, Observação manual, com detalhes adicionais.')
  assert.equal(draft.freeText, 'Observação manual, com detalhes adicionais.')
  draft = toggleReason(toggleReason(draft, 'game'), 'game')
  assert.equal(formatReason(draft), 'Assunto relacionado a jogos, Observação manual, com detalhes adicionais.')
})

test('editar observações e desmarcar preserva texto livre, vírgulas e quebras de linha', () => {
  let draft = toggleReason(emptyReason(), 'game')
  const notes = 'Confira a fonte, comentário adicional.\nSegunda linha.'
  draft = editReason(draft, formatReason(draft) + ', ' + notes)
  assert.equal(draft.freeText, notes)
  draft = toggleReason(draft, 'game')
  assert.equal(formatReason(draft), notes)
})

test('texto totalmente personalizado e alterações nos motivos gerados não perdem conteúdo', () => {
  const draft = toggleReason(toggleReason(emptyReason(), 'game'), 'related')
  const custom = 'Reconheço parcialmente como jogo, Confira o contexto manualmente.'
  const edited = editReason(draft, custom)
  assert.equal(formatReason(edited), custom)
  assert.deepEqual(edited.selected, [])
  const removed = editReason(draft, 'Assunto relacionado a jogos, Minha observação')
  assert.deepEqual(removed.selected, ['related'])
  assert.equal(removed.freeText, 'Minha observação')
  assert.deepEqual(editReason(draft, ''), emptyReason())
})

test('atalho já escrito manualmente não duplica nem apaga a observação ao desmarcar', () => {
  const manual = { ...emptyReason(), freeText: 'Reconheço como jogo, Minha observação' }
  const checked = toggleReason(manual, 'game')
  assert.equal(formatReason(checked), manual.freeText)
  assert.equal(formatReason(toggleReason(checked, 'game')), manual.freeText)
  const edited = editReason(checked, manual.freeText + ' adicional')
  assert.equal(edited.freeText, manual.freeText + ' adicional')
  assert.deepEqual(edited.selected, ['game'])
})

test('motivos mistos geram aviso sem impedir motivo personalizado ou apagar dados', () => {
  assert.equal(hasMixedReasons(emptyReason()), false)
  const positive = toggleReason(emptyReason(), 'game')
  assert.equal(hasMixedReasons(positive), false)
  const mixed = toggleReason(positive, 'not-related')
  assert.equal(hasMixedReasons(mixed), true)
  assert.equal(hasMixedReasons(toggleReason(mixed, 'game')), false)
  assert.equal(reasonOptions.length, 6)
})

test('composição mantém observação extensa intacta para validar limite sem truncamento', () => {
  const draft = { ...emptyReason(), freeText: 'x'.repeat(500) }
  assert.equal(formatReason(draft).length, 500)
  assert.ok(formatReason(toggleReason(draft, 'game')).length > 500)
  assert.equal(draft.freeText.length, 500)
})
