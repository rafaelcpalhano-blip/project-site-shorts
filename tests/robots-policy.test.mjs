import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
test('launch candidate permits public crawling while excluding administrative and API routes without replacing authorization',async()=>{
 const robots=await readFile(new URL('../public/robots.txt',import.meta.url),'utf8')
 assert.doesNotMatch(robots,/<html|<!doctype|^sitemap:/mi)
 const directives=robots.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'))
 assert.deepEqual(directives,['User-agent: *','Allow: /','Disallow: /admin','Disallow: /api'])
 assert.ok(!directives.includes('Disallow: /'))
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8')
 assert.match(headers,/\/robots\.txt\r?\n  Content-Type: text\/plain; charset=utf-8\r?\n  Cache-Control: public, max-age=0, must-revalidate/)
 assert.match(headers,/\/admin\r?\n  X-Robots-Tag: noindex, nofollow/)
 assert.match(headers,/\/admin\/\*\r?\n  X-Robots-Tag: noindex, nofollow/)
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8')
 assert.doesNotMatch(html,/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i)
})
