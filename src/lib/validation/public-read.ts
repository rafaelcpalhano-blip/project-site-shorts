export interface PublicCursor { time: string; id: string; scope: string }
export function publicId(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) throw new Error('invalid-input')
  return value
}
export function publicCursor(value: unknown, scope: string): PublicCursor | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-input')
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['time','id','scope'].includes(key)) || data.scope !== scope || typeof data.time !== 'string' || !Number.isFinite(Date.parse(data.time)) || new Date(data.time).toISOString() !== data.time) throw new Error('invalid-input')
  return { id: publicId(data.id), time: data.time, scope }
}
