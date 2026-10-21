export const reasonOptions = [
  { id: 'game', text: 'Reconheço como jogo', positive: true },
  { id: 'related', text: 'Assunto relacionado a jogos', positive: true },
  { id: 'suitable', text: 'Faz sentido para plataforma', positive: true },
  { id: 'not-game', text: 'Não reconheço como jogo', positive: false },
  { id: 'not-related', text: 'Não é assunto relacionado a jogos', positive: false },
  { id: 'not-suitable', text: 'Não faz sentido para plataforma', positive: false },
] as const
export type ReasonId = typeof reasonOptions[number]['id']
export interface ReasonDraft { selected: ReasonId[]; freeText: string }
export const emptyReason = (): ReasonDraft => ({ selected: [], freeText: '' })
const tokens = (text: string) => text.split(', ').map(part => part.trim())
function prefixOptions(draft: ReasonDraft) {
  const manual = tokens(draft.freeText)
  return reasonOptions.filter(option => draft.selected.includes(option.id) && !manual.includes(option.text))
}
export function formatReason(draft: ReasonDraft): string {
  return [...prefixOptions(draft).map(option => option.text), ...(draft.freeText ? [draft.freeText] : [])].join(', ')
}
export function toggleReason(draft: ReasonDraft, id: ReasonId): ReasonDraft {
  return { ...draft, selected: draft.selected.includes(id) ? draft.selected.filter(value => value !== id) : [...draft.selected, id] }
}
// Editing a generated phrase turns that edited content into free text; never discard it.
export function editReason(draft: ReasonDraft, value: string): ReasonDraft {
  const prefix = prefixOptions(draft)
  const kept = new Set<ReasonId>()
  let freeText = value
  while (true) {
    const option = prefix.find(candidate => !kept.has(candidate.id) && (freeText === candidate.text || freeText.startsWith(candidate.text + ', ')))
    if (!option) break
    kept.add(option.id)
    freeText = freeText === option.text ? '' : freeText.slice(option.text.length + 2)
  }
  const manual = tokens(freeText)
  const selected = reasonOptions.filter(option => kept.has(option.id) || (draft.selected.includes(option.id) && !prefix.includes(option) && manual.includes(option.text))).map(option => option.id)
  return { selected, freeText }
}
export function hasMixedReasons(draft: ReasonDraft): boolean {
  const selected = reasonOptions.filter(option => draft.selected.includes(option.id))
  return selected.some(option => option.positive) && selected.some(option => !option.positive)
}
