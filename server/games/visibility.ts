import type { RecordData, AtomicTransaction } from '../firestore/atomic-store.ts'
export function isVisibleGame(game: RecordData | null): boolean { return game?.status === 'active' }
export async function shortGameVisible(short: RecordData, tx: Pick<AtomicTransaction, 'get'>): Promise<boolean> {
  return typeof short.gameId === 'string' && /^[\w-]{1,128}$/.test(short.gameId) && isVisibleGame(await tx.get('games/' + short.gameId))
}
