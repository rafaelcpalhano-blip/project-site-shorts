import type { Timestamp } from 'firebase/firestore'
export interface GameDocument {
  officialName: string
  normalizedName: string
  aliases: string[]
  status: 'active' | 'inactive'
  createdAt: Timestamp
  updatedAt: Timestamp
  externalId?: string
  externalSource?: string
}
export interface ShortDocument {
  originalUrl: string
  normalizedUrl: string
  platform: 'YouTube' | 'TikTok' | 'Twitch'
  platformVideoId: string
  title: string
  channelName: string
  gameId: string
  createdAt: Timestamp
  moderationStatus: 'pending' | 'published' | 'rejected' | 'removed'
}
export interface CommentDocument {
  shortId: string
  content: string
  createdAt: Timestamp
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'removed'
}
// Proposed persistence shape. No submission or administrative write service exists yet.
export interface GameRequestDocument {
  requestedName: string
  normalizedName: string
  status: 'pending' | 'approved' | 'linked' | 'rejected'
  createdAt: Timestamp
  decidedAt?: Timestamp
  decidedBy?: string
  gameId?: string
  reasonCode?: string
}

