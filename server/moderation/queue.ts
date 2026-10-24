import {loadAdminList,filteredListCursor,filteredListNext} from '../admin/list-page.ts'
import type { AtomicStore, RecordData, StoreQuery } from '../firestore/atomic-store.ts'
import type { AdminCursor, QueuePage, ReviewDetail, ReviewShort } from '../../src/features/admin/types/moderation.ts'
import { counter, ReviewError, restoreTarget, publishedBeforeBlock } from './review-short.ts'
export function parseQuery(input: unknown, keys: string[]): RecordData {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) throw new ReviewError('invalid-input', 400)
  return input as RecordData
}
export function shortId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new ReviewError('invalid-input', 400)
  return value
}
export function cursor(value: unknown): AdminCursor | undefined {
  if (value === undefined || value === null) return undefined
  const data = parseQuery(value, ['time', 'id'])
  if (typeof data.time !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.time) || !Number.isFinite(Date.parse(data.time))) throw new ReviewError('invalid-input', 400)
  return { time: new Date(data.time).toISOString(), id: shortId(data.id) }
}
function time(value: unknown): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error('invalid-date')
  return value.toISOString()
}
async function page(store: AtomicStore, query: StoreQuery) {
  if (!store.query) throw new Error('query-unavailable')
  const rows = await store.query(query)
  const visible = rows.slice(0, 20)
  const last = visible.at(-1)
  return { rows: visible, next: rows.length > 20 && last ? { id: last.id, time: time(last.data[query.orderBy]) } : null }
}
export async function loadQueue(input: unknown, store: AtomicStore): Promise<QueuePage> {
  const data = parseQuery(input, ['queue', 'cursor', 'sort'])
  if (data.queue !== 'reports' && data.queue !== 'pending' && data.queue !== 'removed' && data.queue !== 'blocked' && data.queue !== 'unblocked' && data.queue !== 'reviewed') throw new ReviewError('invalid-input', 400)
  const reports = data.queue === 'reports'||data.queue==='reviewed'
  if(data.queue==='blocked'||data.queue==='unblocked'){
    const sort=data.sort??'date-desc'
    if(!['date-desc','date-asc','text-asc','text-desc'].includes(String(sort)))throw new ReviewError('invalid-input',400)
    const base=filteredListCursor(data.cursor,'shorts','pending',sort as import('../../src/features/admin/types/list-order.ts').AdminSort,String(data.queue))
    const result=await loadAdminList('shorts','pending',sort,base,store)
    return {items:result.rows.filter(({data:item})=>publishedBeforeBlock(item)===(data.queue==='blocked')).map(({id,data:item})=>({id:shortId(id),title:String(item.title||''),status:String(item.moderationStatus),time:time(item.createdAt)})),next:filteredListNext(result.next,String(data.queue)),filteredWindow:true}
  }
  if(data.sort!==undefined){
    const result=await loadAdminList(reports?'reportSummaries':'shorts',data.queue==='reviewed'?'reviewed':data.queue==='removed'?'removed':'pending',data.sort,data.cursor,store)
    return {items:result.rows.map(({id,data:item})=>reports?{id:shortId(id),title:typeof item.title==='string'?item.title:'',count:counter(item.count),reviewedCount:counter(item.reviewedCount??0),time:time(item.firstReportedAt)}:{id:shortId(id),title:String(item.title||''),status:String(item.moderationStatus),time:time(item.createdAt)}),next:result.next}
  }
  const result = await page(store, { collection: reports ? 'reportSummaries' : 'shorts',
    filter: { field: reports ? 'status' : 'moderationStatus', value: data.queue==='reviewed'?'reviewed':data.queue === 'removed' ? 'removed' : 'pending' },
    orderBy: reports ? 'lastReportedAt' : 'createdAt', limit: 21, cursor: cursor(data.cursor) })
  return { items: result.rows.map(({ id, data: item }) => reports ?
    { id: shortId(id), count: counter(item.count), reviewedCount: counter(item.reviewedCount ?? 0), time: time(item.lastReportedAt) } :
    { id: shortId(id), title: String(item.title || ''), status: String(item.moderationStatus), time: time(item.createdAt) }), next: result.next }
}
export async function loadDetail(input: unknown, store: AtomicStore): Promise<ReviewDetail> {
  const data = parseQuery(input, ['shortId', 'cursor'])
  const id = shortId(data.shortId)
  const after = cursor(data.cursor)
  const { short, summary, state } = await store.transact(async tx => {
    const short = await tx.get('shorts/' + id)
    return { short, summary: await tx.get('reportSummaries/' + id),
      state: short?.moderationStatus === 'removed' ? await tx.get('moderationStates/' + id) : null }
  })
  if (!short) throw new ReviewError('short-unavailable', 404)
  const result = await page(store, { collection: 'reports', filter: { field: 'shortId', value: id },
    orderBy: 'createdAt', limit: 21, cursor: after })
  const logs = !after && store.query ? await store.query({ collection: 'moderationLogs',
    filter: { field: 'contentId', value: id }, orderBy: 'createdAt', limit: 10 }) : []
  const item: ReviewShort = { id, title: String(short.title || ''), originalTitle: typeof short.originalTitle === 'string' ? short.originalTitle : null,
    url: typeof short.normalizedUrl === 'string' ? short.normalizedUrl : '', platform: String(short.platform || ''),
    gameId: String(short.gameId || ''), status: String(short.moderationStatus), createdAt: time(short.createdAt),
    ...(short.moderationStatus==='pending'&&publishedBeforeBlock(short)?{blocked:true}:{}),
    revision: counter(short.reviewVersion ?? 0), restoreStatus: restoreTarget(short, state) }
  return { short: item, count: counter(summary?.count ?? 0), reviewedCount: counter(summary?.reviewedCount ?? 0),
    logs: logs.map(({ data: log }) => ({ action: String(log.action || ''), reason: String(log.reason || log.reasonCode || ''), createdAt: time(log.createdAt) })),
    reports: result.rows.map(({ data: report }) => ({ reason: String(report.reason || ''), createdAt: time(report.createdAt) })), next: result.next }
}
