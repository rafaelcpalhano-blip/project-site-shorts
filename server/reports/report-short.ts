import {updateFields} from '../admin/update-event.ts'
import { shortGameVisible } from '../games/visibility.ts'
import { validateReportInput } from '../../src/lib/validation/report-input.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
export class ReportError extends Error {}
export async function reportShort(input: unknown, visitor: string, options: { store: AtomicStore; now: () => Date }) {
  const report = validateReportInput(input)
  if (!/^[a-f0-9]{64}$/.test(visitor)) throw new ReportError('invalid-session')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('report:' + report.shortId + ':' + visitor))
  const id = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return options.store.transact(async tx => {
    const short = await tx.get('shorts/' + report.shortId)
    // Do not expose whether an unavailable video exists privately.
    if (!short || short.moderationStatus !== 'published' || !await shortGameVisible(short, tx)) throw new ReportError('short-unavailable')
    const previous = await tx.get('reports/' + id)
    if (previous) return { received: true, duplicate: true }
    const summary = await tx.get('reportSummaries/' + report.shortId)
    const count = summary?.count ?? 0
    if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) >= Number.MAX_SAFE_INTEGER) throw new Error('invalid-summary')
    const now = options.now()
    if (!Number.isFinite(now.getTime())) throw new Error('invalid-clock')
    tx.create('reports/' + id, { ...report, visitorHash: visitor, createdAt: now, status: 'pending' })
    tx.set('reportSummaries/' + report.shortId, { ...(summary ?? {}), shortId: report.shortId, title: typeof short.title==='string'?short.title:'', count: Number(count) + 1,
      firstReportedAt: summary?.firstReportedAt ?? now, lastReportedAt: now, status: 'pending' })
    tx.create('moderationLogs/'+crypto.randomUUID(),{...updateFields('reports',{shortId:report.shortId,title:short.title,platform:short.platform}),contentType:'short',contentId:report.shortId,action:'report-received',reason:report.reason,createdAt:now,actor:'anonymous'})
    // Reporting never changes publication, video reservations or daily quotas.
    return { received: true, duplicate: false }
  })
}
