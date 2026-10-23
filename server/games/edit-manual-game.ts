import { inspectRemoteCover } from './remote-cover.ts'
import { gameCoverUrl } from '../../src/lib/validation/game-cover.ts'
import type { AtomicStore } from '../firestore/atomic-store.ts'
import { ReviewError, counter } from '../moderation/review-short.ts'
import { validateManualGameDetails } from '../../src/lib/validation/manual-game-details.ts'
import { nameIdentity, nameStatePath, readNameKeys, writeNameKeys, validateNameReference, GameNameError } from './name-keys.ts'
export async function editManualGame(input: unknown, uid: string, options: { store: AtomicStore; now: () => Date; inspectCover?: (url:string)=>Promise<string> }) {
  if (!uid || uid.length > 128) throw Error('invalid-actor')
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ReviewError('invalid-input',400)
  const data = input as Record<string, unknown>
  if (Object.keys(data).some(key => !['id','revision','confirmed','reason','details'].includes(key)) || typeof data.id !== 'string' || !/^[\w-]{1,128}$/.test(data.id) || data.confirmed !== true || !Number.isSafeInteger(data.revision) || Number(data.revision) < 0 || Number(data.revision) >= Number.MAX_SAFE_INTEGER || typeof data.reason !== 'string' || data.reason.trim().length < 5 || data.reason.trim().length > 500 || /[\p{C}<>]/u.test(data.reason)) throw new ReviewError('invalid-input',400)
  let details: ReturnType<typeof validateManualGameDetails>
  try { details = validateManualGameDetails(data.details) } catch { throw new ReviewError('invalid-input',400) }
  if(details.imageUrl?.startsWith('https://')&&!gameCoverUrl(details.imageUrl)){
    // Authoritative preflight before outbound I/O, followed by the existing atomic recheck.
    await options.store.transact(async tx=>{const game=await tx.get('games/'+data.id);if(!game)throw new ReviewError('game-unavailable',404);if(game.source!=='manual')throw new ReviewError('manual-edit-only',409);if(counter(game.reviewVersion??0)!==data.revision)throw new ReviewError('stale-review')})
    try { const checked=await (options.inspectCover??inspectRemoteCover)(details.imageUrl);const normalized=validateManualGameDetails({...details,imageUrl:checked});if(!normalized.imageUrl?.startsWith('https://'))throw Error('invalid-cover');details=normalized } catch { throw new ReviewError('invalid-cover',400) }
  }
  const identity = await nameIdentity(details.name), now = options.now()
  if (!Number.isSafeInteger(now.getTime()) || now.getTime() < 0) throw Error('invalid-clock')
  return options.store.transact(async tx => {
    const path = 'games/' + data.id, game = await tx.get(path), state = await tx.get('gameModerationStates/' + data.id)
    if (!game) throw new ReviewError('game-unavailable',404)
    if (game.source !== 'manual') throw new ReviewError('manual-edit-only',409)
    if (!['active','hidden','disabled','inactive','banned'].includes(String(game.status))) throw Error('invalid-game-state')
    const revision = counter(game.reviewVersion ?? 0)
    if (revision !== data.revision) throw new ReviewError('stale-review')
    const marker = await tx.get(nameStatePath)
    if (marker?.ready !== true || marker.version !== 1) throw new GameNameError('game-names-preparing',503)
    const current = await nameIdentity(game.officialName), records = await readNameKeys(tx,identity)
    for (const otherId of records.ids) {
      const other = otherId === data.id ? game : await tx.get('games/' + otherId)
      if (!other) throw Error('invalid-name-reference')
      // A new spelling may share the game's existing skeleton, so validate only other records here.
      if (otherId !== data.id) { validateNameReference(identity,records,otherId,other); throw new GameNameError('game-name-conflict') }
    }
    const reserved = game.reservedNames ?? []
    if (!Array.isArray(reserved) || reserved.length > 20 || reserved.some(value => typeof value !== 'string')) throw Error('invalid-name-history')
    const reservedNames = [...reserved] as string[]
    if (current.normalizedName !== identity.normalizedName && !reservedNames.includes(current.name)) reservedNames.push(current.name)
    if (reservedNames.length > 20) throw new ReviewError('name-history-limit',409)
    const { name, ...metadata } = details
    const next = { ...game, ...metadata, officialName: name, normalizedName: identity.normalizedName, reservedNames, reviewVersion: revision + 1, updatedAt: now }
    writeNameKeys(tx,identity,records,data.id as string,now)
    tx.set(path,next)
    // Keep an existing ban's restoration revision valid without changing its prior state.
    if (state?.revision === revision) tx.set('gameModerationStates/' + data.id,{...state,revision:revision+1})
    const fields = ['officialName','description','imageUrl','releaseDate','genres','gameModes','platforms','aliases']
    tx.create('moderationLogs/' + crypto.randomUUID(),{contentType:'game',contentId:data.id,action:'edit-metadata',actorUid:uid,reason:(data.reason as string).trim(),revision:revision+1,createdAt:now,
      before:Object.fromEntries(fields.map(key=>[key,game[key]??null])),after:Object.fromEntries(fields.map(key=>[key,next[key as keyof typeof next]??null]))})
    return {id:data.id,revision:revision+1}
  })
}
