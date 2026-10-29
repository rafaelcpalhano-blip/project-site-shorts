import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {createOrderedFeedClient,feedOrderLabels,normalizeFeedOrder} from '../src/features/shorts/services/ordered-feed-api.ts'
import * as catalogCache from '../src/features/games/services/catalog-cache.ts'
import * as deferredModule from '../src/components/ui/deferred-module.ts'
import * as cursorPages from '../src/features/shorts/services/cursor-pages.ts'
import * as feedReturn from '../src/features/shorts/services/feed-return.ts'
import * as pagination from '../src/features/shorts/services/pagination-window.ts'
import { TITLE_SEARCH_ENABLED } from '../src/lib/features/title-search.ts'
import { createPublicApi } from '../server/http/public-api.ts'

const require = createRequire(import.meta.url)
function renderFeed(file, props = {}) {
  let searches = 0
  const source = readFileSync(new URL('../src/features/shorts/components/' + file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  const componentRequire = name => {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name)
    if (name.includes('features/title-search')) return { TITLE_SEARCH_ENABLED }
    if (name.includes('title-search-api')) return { createTitleSearchClient: () => () => { searches++; throw Error('Busca não autorizada') } }
    if (name.includes('ordered-feed-api')) return {createOrderedFeedClient,feedOrderLabels,normalizeFeedOrder}
    if (name.includes('catalog-cache')) return catalogCache
    if (name.includes('public-repository')) return { createPublicRepository: () => ({}) }
    if (name.includes('firebase/client')) return { database: {} }
    if (name.includes('deferred-module')) return deferredModule
    if (name.includes('cursor-pages')) return cursorPages
    if (name.includes('feed-return')) return feedReturn
    if (name.includes('pagination-window')) return pagination
    if (name.includes('use-feed-page-scroll')) return { useFeedPageScroll: () => ({ heading: { current: null }, requestScroll: () => {} }) }
    if (name.includes('FeedPagination')) return { FeedPagination: loadComponent('FeedPagination') }
    if (name.includes('GamePageNavigation')) return { GamePageNavigation: () => React.createElement('a', { href: '/' }, 'Voltar ao início') }
    if (name === 'react-router-dom') return { useLocation: () => ({ key: 'fixture', state: null }), Link: ({ to, children }) => React.createElement('a', { href: to }, children) }
    if (name.includes('demo-context')) return { useDemo: () => ({ state: { shorts: [], comments: [] } }) }
    if (name.includes('fixtures')) return { games: [{ id: 'portal', name: 'Portal' }] }
    if (name.endsWith('.css')) return { default: {} }
    return {}
  }
  function loadComponent(name) {
    const source = readFileSync(new URL('../src/features/shorts/components/' + name + '.tsx', import.meta.url), 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
    const nested = {}
    vm.runInNewContext(output, { exports: nested, require: componentRequire })
    return nested[name]
  }
  vm.runInNewContext(compiled, { exports, require: componentRequire })
  const Component = exports[file.replace('.tsx', '')]
  const html = renderToStaticMarkup(React.createElement(Component, props))
  assert.equal(searches, 0)
  return html
}

test('feed persistente e demonstrativo ocultam pesquisa e preservam filtro/paginação', () => {
  assert.equal(TITLE_SEARCH_ENABLED, false)
  for (const file of ['FirestoreFeed.tsx', 'ShortFeed.tsx']) {
    const html = renderFeed(file)
    assert.doesNotMatch(html, /type="search"|Buscar por título|Pesquisar|Continuar busca/)
    assert.match(html, /Filtrar por jogo/)
    assert.match(html, /Todos os jogos/)
    assert.match(html, /Últimos Postados/)
    assert.match(html, /Paginação de shorts/)
    assert.match(html, /Próxima/)
  }
})

test('página individual continua com feed e sem filtro que substitua o jogo fixo', () => {
  const html = renderFeed('FirestoreFeed.tsx', { gameId: 'portal' })
  assert.doesNotMatch(html, /type="search"|Todos os jogos/)
  assert.match(html, /Voltar ao início/)
  assert.match(html, /Últimos Postados/)
})

test('rota pública desativada responde 404 sem leituras, transações, verificação ou cota', async () => {
  const forbidden = () => { throw Error('Operação não autorizada') }
  const api = await createPublicApi({ origin: 'https://clipzone.test', visitorSecret: 'ab'.repeat(32), store: { transact: forbidden, searchShorts: forbidden }, now: () => new Date(), maximumAttempts: 20, attemptWindowMs: 60000, allowSessionIssuance: forbidden, verify: forbidden })
  for (const method of ['GET', 'POST']) {
    const response = await api(new Request('https://clipzone.test/api/shorts/search', { method }))
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('índices exclusivos ficam arquivados, isenções não geram índices', () => {
  const active = JSON.parse(readFileSync(new URL('../firestore/firestore.indexes.json', import.meta.url)))
  const archived = JSON.parse(readFileSync(new URL('../docs/title-search.indexes.dormant.json', import.meta.url)))
  assert.ok(!active.indexes.some(i => i.fields.some(f => f.fieldPath === 'searchFragments')))
  assert.equal(archived.indexes.length, 2)
  for (const field of ['searchFragments', 'titleSearchVersion']) assert.deepEqual(active.fieldOverrides.find(f => f.fieldPath === field).indexes, [])
})

test('release feed offers Mais Curtidos without scheduled relevance promises',()=>{
 const html=renderFeed('FirestoreFeed.tsx');assert.match(html,/Mais Curtidos/);assert.match(html,/Ordenar por/);assert.doesNotMatch(html,/Mais Relevante|45 minutos|Ranking atualizado/)
})
test('retired return context starts likes at page one rather than reusing the old pager',()=>{
 const legacyPager={knownCursors(){throw Error('obsolete pager reused')}}
 feedReturn.saveFeedReturn('fixture',{order:'relevant',filter:'',index:2,scroll:900,query:'',draft:'',attempt:0,pager:legacyPager})
 const html=renderFeed('FirestoreFeed.tsx');assert.match(html,/<option value="likes" selected="">Mais Curtidos/);assert.doesNotMatch(html,/Mais Relevante/)
})
