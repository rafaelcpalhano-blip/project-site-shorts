import type { Thumbnail } from '../../../lib/validation/thumbnail.ts'
export interface Game { id: string; name: string }
export interface Short {
  thumbnail?: Thumbnail
  id: string; identity: string; url?: string; platform: string; title: string
  channelName: string; gameId: string; gameName?: string; likeCount?: number; createdAt: number
}
export interface Comment { id: string; shortId: string; content: string; status: 'pending' | 'approved' }
export interface GameRequest { id: string; name: string }
export interface DemoState { shorts: Short[]; comments: Comment[]; requests: GameRequest[] }

