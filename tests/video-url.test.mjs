import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVideoUrl } from '../src/features/submissions/services/video-url.ts'

test('normaliza variantes e rastreamento de YouTube Shorts', () => {
  const expected = parseVideoUrl('https://www.youtube.com/shorts/abcdefghijk')
  assert.deepEqual(parseVideoUrl('https://m.youtube.com/shorts/abcdefghijk/?si=tracking#t=2'), expected)
})
test('identifica o mesmo Twitch Clip nas duas URLs oficiais', () => {
  assert.deepEqual(parseVideoUrl('https://clips.twitch.tv/ExampleClip'), parseVideoUrl('https://www.twitch.tv/channel/clip/ExampleClip?tt_content=clip'))
})
test('normaliza TikTok preservando identificador', () => {
  assert.equal(parseVideoUrl('https://www.tiktok.com/@creator/video/123456789?lang=pt').identity, 'TikTok:123456789')
})
test('rejeita origens falsas, protocolos e credenciais', () => {
  for (const url of [
    'javascript:alert(1)', 'http://clips.twitch.tv/ExampleClip',
    'https://youtube.com.evil.example/shorts/abcdefghijk',
    'https://youtube.com@evil.example/shorts/abcdefghijk',
    'https://name:password@www.youtube.com/shorts/abcdefghijk',
    'https://www.youtube.com:8080/shorts/abcdefghijk',
    'https://www.twitch.tv/channel', 'https://www.youtube.com/watch?v=abcdefghijk',
    'https://vm.tiktok.com/shortlink',
  ]) assert.throws(() => parseVideoUrl(url), undefined, url)
})
