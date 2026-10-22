export interface PublicCursor { time: string; id: string; scope: string; number?:number }
export function publicId(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) throw new Error('invalid-input')
  return value
}
export function publicCursor(value: unknown, scope: string): PublicCursor | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-input')
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['time','id','scope','number'].includes(key)) || data.scope !== scope || typeof data.time !== 'string' || !Number.isFinite(Date.parse(data.time)) || new Date(data.time).toISOString() !== data.time) throw new Error('invalid-input')
  if(data.number!==undefined&&(!scope.startsWith('comments:')||!Number.isSafeInteger(data.number)||Number(data.number)<1))throw Error('invalid-input')
  return { id: publicId(data.id), time: data.time, scope, ...(data.number!==undefined?{number:Number(data.number)}:{}) }
}
