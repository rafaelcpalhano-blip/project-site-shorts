import { parseVideoUrl } from './video-url.ts'
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dados de envio inválidos.')
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('O envio contém campos não permitidos.')
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, maximum: number, optional = false, multiline = false): string {
  if (value === undefined && optional) return ''
  if (typeof value !== 'string') throw new Error(label + ' deve ser um texto.')
  const normalized = value.normalize('NFC').trim()
  if ((!optional && !normalized) || normalized.length > maximum) throw new Error(label + ': informe entre 1 e ' + maximum + ' caracteres.')
  // Preserve ordinary punctuation, accents and game names. Reject controls.
  const hasControls = [...normalized].some(character => {
    const code = character.codePointAt(0)!
    if (multiline && [9, 10, 13].includes(code)) return false
    return code < 32 || code === 127
  })
  if (hasControls) throw new Error(label + ' contém caracteres de controle.')
  return normalized
}
function identifier(value: unknown, label: string): string {
  const result = text(value, label, 128)
  if (!/^[\w-]+$/u.test(result)) throw new Error(label + ' inválido.')
  return result
}
export function validateSubmissionInput(value: unknown) {
  const data = object(value, ['url', 'gameId', 'channelName'])
  const originalUrl = text(data.url, 'Link do short', 2048)
  return { ...parseVideoUrl(originalUrl), originalUrl,
    gameId: identifier(data.gameId, 'Jogo'), channelName: text(data.channelName, 'Nome do canal', 80, true) }
}
export function validateCommentInput(value: unknown) {
  const data = object(value, ['shortId', 'content'])
  return { shortId: identifier(data.shortId, 'Short'), content: text(data.content, 'Comentário', 500, false, true) }
}
export function validateGameRequestInput(value: unknown) {
  const data = object(value, ['name'])
  const name = text(data.name, 'Nome do jogo', 100)
  return { name, normalizedName: name.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ') }
}

