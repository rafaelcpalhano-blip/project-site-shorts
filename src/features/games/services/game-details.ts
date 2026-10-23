import { manualGameCoverUrl } from '../../../lib/validation/manual-game-details.ts'
import { gameCoverUrl } from '../../../lib/validation/game-cover.ts'
import type { Game } from '../../shorts/types/models.ts'
export interface GameDetails extends Game {
  provisional: boolean; description: string; descriptionPtBr: string | null; aliases: string[]; genres: string[]; gameModes: string[]; platforms: string[]
  releaseDate: string | null; imageUrl: string | null; sourceUrl: string | null; source: 'IGDB' | 'manual' | null
}
const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : ''
const list = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.slice(0, 200)))].slice(0, 50) : []
function officialUrl(value: unknown, image = false): string | null {
  if (image) return gameCoverUrl(value) ?? null
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const allowed = url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname === (image ? 'images.igdb.com' : 'www.igdb.com') &&
      (image ? url.pathname.startsWith('/igdb/image/upload/') : url.pathname.startsWith('/games/'))
    if (!allowed) return null

    return url.href
  } catch { return null }
}
export function mapGameDetails(id: string, data: Record<string, unknown>): GameDetails {
  if (data.status !== 'active' || typeof data.officialName !== 'string' || !data.officialName.trim()) throw new Error('Jogo indisponível')
  const official = data.source === 'IGDB'
  const translation = data.translation && typeof data.translation === 'object' && !Array.isArray(data.translation) ? data.translation as Record<string,unknown> : null
  const descriptionPtBr = official && translation?.locale === 'pt-BR' && translation.sourceDescription === data.description &&
    translation.sourceName === data.officialName && typeof translation.text === 'string' && !!translation.text.trim() &&
    translation.text.length <= 24000 ? translation.text : null
  const date = typeof data.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.releaseDate) &&
    Number.isFinite(Date.parse(data.releaseDate)) && new Date(data.releaseDate).toISOString().slice(0,10) === data.releaseDate ? data.releaseDate : null
  return {id, provisional: data.source==='manual'&&data.reviewStatus==='provisional', name: text(data.officialName,500), description: text(data.description,20000), descriptionPtBr, aliases:list(data.aliases),
    genres:list(data.genres), gameModes:list(data.gameModes), platforms:list(data.platforms), releaseDate:date,
    imageUrl:official ? officialUrl(data.imageUrl,true):data.source==='manual'?manualGameCoverUrl(data.imageUrl)??null:null, sourceUrl:official ? officialUrl(data.sourceUrl):null, source:official?'IGDB':data.source==='manual'?'manual':null}
}
