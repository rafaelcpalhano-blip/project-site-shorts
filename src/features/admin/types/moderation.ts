export interface AdminCursor { time: string; id: string }
export interface ReviewShort {
  id: string; title: string; originalTitle: string | null; url: string; platform: string
  gameId: string; status: string; createdAt: string; revision: number; restoreStatus: 'published' | 'pending' | null
}
export interface QueueItem { id: string; title?: string; status?: string; count?: number; reviewedCount?: number; time: string }
export interface QueuePage { items: QueueItem[]; next: AdminCursor | null }
export interface ReviewDetail {
  short: ReviewShort; count: number; reviewedCount: number; logs: { action: string; reason: string; createdAt: string }[]
  reports: { reason: string; createdAt: string }[]; next: AdminCursor | null
}
export type ReviewAction = 'dismiss' | 'approve' | 'remove' | 'restore'
