import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
test('homologation robots policy is plain text and blocks every crawler without pretending to secure private routes',async()=>{
 const robots=await readFile(new URL('../public/robots.txt',import.meta.url),'utf8')
 assert.doesNotMatch(robots,/<html|<!doctype|^sitemap:|^allow:/mi)
 const directives=robots.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'))
 assert.deepEqual(directives,['User-agent: *','Disallow: /'])
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8')
 assert.match(headers,/\/robots\.txt\r?\n  Content-Type: text\/plain; charset=utf-8\r?\n  Cache-Control: public, max-age=0, must-revalidate/)
})
