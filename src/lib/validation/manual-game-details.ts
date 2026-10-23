import { externalGameCoverUrl } from './external-game-cover.ts'
import { gameCoverUrl } from './game-cover.ts'
export function manualGameCoverUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  if (/^\/images\/games\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\.(?:png|jpg|jpeg|webp)$/.test(value)) return value
  return gameCoverUrl(value) ?? externalGameCoverUrl(value)
}
export interface ManualGameDetails {
  name: string; description: string; imageUrl: string | null; releaseDate: string | null
  genres: string[]; gameModes: string[]; platforms: string[]; aliases: string[]
}
export function validateManualGameDetails(input: unknown): ManualGameDetails {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('invalid-input')
  const data = input as Record<string, unknown>
  if (Object.keys(data).some(key => !['name','description','imageUrl','releaseDate','genres','gameModes','platforms','aliases'].includes(key))) throw Error('invalid-input')
  const text = (value: unknown, max: number, multiline = false) => {
    if (typeof value !== 'string') throw Error('invalid-input')
    const result = value.normalize('NFC').trim()
    if (result.length > max || /[<>]/.test(result) || /\p{C}/u.test(multiline ? result.replace(/[\r\n\t]/g, '') : result)) throw Error('invalid-input')
    return result
  }
  const name = text(data.name, 100)
  if (!name) throw Error('invalid-input')
  const list = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 20) throw Error('invalid-input')
    return [...new Set(value.map(item => text(item, 100)).filter(Boolean))]
  }
  const imageUrl = data.imageUrl === null || data.imageUrl === '' ? null : manualGameCoverUrl(data.imageUrl)
  if (imageUrl === undefined) throw Error('invalid-input')
  const releaseDate = data.releaseDate === '' ? null : data.releaseDate
  if (releaseDate !== null && (typeof releaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate) || !Number.isFinite(Date.parse(releaseDate)) || new Date(releaseDate).toISOString().slice(0, 10) !== releaseDate)) throw Error('invalid-input')
  return { name, description: text(data.description, 2000, true), imageUrl, releaseDate: releaseDate as string | null,
    genres: list(data.genres), gameModes: list(data.gameModes), platforms: list(data.platforms), aliases: list(data.aliases) }
}
