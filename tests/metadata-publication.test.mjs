import test from 'node:test'
import assert from 'node:assert/strict'
import { createMetadataVerifier } from '../server/videos/verify.ts'
import { decidePublication } from '../server/submissions/decision.ts'
const evidence = { existence:'confirmed', shortFormat:'confirmed', gameMatch:'confirmed', moderation:'unavailable', flags:[] }
const input = { url:'https://clips.twitch.tv/ExampleClip', gameId:'igdb-115' }
test('metadata composition publishes technically confirmed clips but preserves flagged verdicts', async () => {
  for (const moderation of ['clear', 'unavailable', 'flagged']) {
    const result = await createMetadataVerifier({Twitch:async()=>({...evidence,moderation})})(input)
    assert.equal(decidePublication(result).status, moderation === 'flagged' ? 'pending' : 'published')
    assert.notEqual(result.moderation, 'clear')
  }
})
test('missing adapters and provider failures never authorize publication', async () => {
  for (const adapters of [{}, {Twitch:async()=>{throw new Error('offline')}}]) {
    assert.equal(decidePublication(await createMetadataVerifier(adapters)(input)).status,'retry')
  }
})
