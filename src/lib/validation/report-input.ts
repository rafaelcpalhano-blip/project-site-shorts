export const reportReasons = {
  'wrong-game': 'Jogo incorreto ou conteúdo não relacionado a games',
  'misleading-title': 'Título enganoso ou ofensivo',
  'hate-threat': 'Discriminação ou ameaça',
  'real-violence': 'Violência real',
  'sexual-content': 'Conteúdo sexual',
  'spam': 'Spam ou divulgação abusiva',
  'other': 'Outro problema',
} as const
export type ReportReason = keyof typeof reportReasons
export function validateReportInput(input: unknown): { shortId: string; reason: ReportReason } {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['shortId', 'reason'].includes(key))) throw new Error('invalid-input')
  const data = input as Record<string, unknown>
  if (typeof data.shortId !== 'string' || !/^[a-f0-9]{64}$/.test(data.shortId) ||
      typeof data.reason !== 'string' || !Object.hasOwn(reportReasons, data.reason)) throw new Error('invalid-input')
  return { shortId: data.shortId, reason: data.reason as ReportReason }
}
