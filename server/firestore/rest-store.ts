import {adminListFields,listOrder} from '../admin/list-page.ts'
import type { AtomicStore, AtomicTransaction, RecordData } from './atomic-store.ts'
type Value = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; timestampValue?: string; arrayValue?: { values: Value[] }; mapValue?: { fields: Record<string, Value> } }
function encode(value: unknown): Value {
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  if (value && typeof value === 'object') return { mapValue: { fields: fields(value as RecordData) } }
  throw new Error('Valor Firestore inválido')
}
function fields(data: RecordData): Record<string, Value> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]))
}
function decode(value: Value): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(value.timestampValue!)
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decode)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([key, item]) => [key, decode(item)]))
  return null
}
class FirestoreError extends Error {
  readonly code: string
  constructor(code: string) { super('Firestore: ' + code); this.code = code }
}
interface Options {
  projectId: string
  emulatorPort?: 8080 | 8081
  accessToken?: () => Promise<string>
}
export function createRestStore(options: Options): AtomicStore {
  if (!/^[a-z][a-z0-9-]{2,99}$/.test(options.projectId)) throw new Error('Projeto inválido')
  if (options.emulatorPort && !options.projectId.startsWith('demo-')) throw new Error('Emulador exige projeto demo')
  if (!options.emulatorPort && !options.accessToken) throw new Error('Credencial de servidor não configurada')
  const origin = options.emulatorPort ? 'http://127.0.0.1:' + options.emulatorPort : 'https://firestore.googleapis.com'
  const root = 'projects/' + options.projectId + '/databases/(default)/documents'
  const name = (path: string) => {
    if (!/^[\w-]+\/[\w-]+$/.test(path)) throw new Error('Caminho de documento inválido')
    return root + '/' + path
  }
  const request = async (operation: string, body: unknown) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    headers.Authorization = options.emulatorPort ? 'Bearer owner' : 'Bearer ' + await options.accessToken!()
    const response = await fetch(origin + '/v1/' + root + ':' + operation, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    })
    const result = await response.json()
    if (!response.ok) throw new FirestoreError(result.error?.status || 'UNAVAILABLE')
    return result
  }
  const decodeDocument = (document: {name:string;fields?:Record<string,Value>}) => ({ id:document.name.split('/').at(-1)!, data:Object.fromEntries(Object.entries(document.fields || {}).map(([key,value]) => [key,decode(value)])) })
  return {
    async expiredNetworkRecords(now) {
      if(!Number.isSafeInteger(now.getTime()))throw Error('Prazo inválido')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'networkAbuse'}],where:{fieldFilter:{field:{fieldPath:'expiresAt'},op:'LESS_THAN_OR_EQUAL',value:encode(now)}},orderBy:[{field:{fieldPath:'expiresAt'},direction:'ASCENDING'}],limit:30}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async snapshotGet(path,readTime) {
      if(!Number.isFinite(Date.parse(readTime)))throw new Error('Snapshot inválido')
      const result=await request('batchGet',{documents:[name(path)],readTime})
      const found=(Array.isArray(result)?result:[result]).find(item=>item.found)?.found
      return found?decodeDocument(found).data:null
    },
    async rankingBootstrapPage(collection,after,readTime) {
      if(!['shorts','games','shortLikes','comments','commentRequests'].includes(collection)||after!==undefined&&!/^[\w-]{1,128}$/.test(after)||readTime!==undefined&&!Number.isFinite(Date.parse(readTime)))throw new Error('Preparação inválida')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:collection}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,...(after?{startAt:{before:false,values:[{referenceValue:name(collection+'/'+after)}]}}:{})},...(readTime?{readTime}:{})})
      const rows=Array.isArray(result)?result:[result],point=readTime??rows.find(item=>item.readTime)?.readTime
      if(!point)throw new Error('Snapshot ausente')
      return {items:rows.filter(item=>item.document).map(item=>decodeDocument(item.document)),readTime:point}
    },
    async rankingItemsPage(generationId) {
      if(!/^[a-f0-9]{32}$/.test(generationId))throw new Error('Geração inválida')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'rankingItems'}],select:{fields:[{fieldPath:'generationId'}]},where:{fieldFilter:{field:{fieldPath:'generationId'},op:'EQUAL',value:encode(generationId)}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async rankingSourcePage(after,readTime) {
      if(after!==undefined&&!/^[\w-]{1,128}$/.test(after)||readTime!==undefined&&!Number.isFinite(Date.parse(readTime)))throw new Error('Snapshot inválido')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'shorts'}],select:{fields:['gameId','moderationStatus','createdAt','likeCount'].map(fieldPath=>({fieldPath}))},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,...(after?{startAt:{before:false,values:[{referenceValue:name('shorts/'+after)}]}}:{})},...(readTime?{readTime}:{})})
      const rows=Array.isArray(result)?result:[result],point=readTime??rows.find(item=>item.readTime)?.readTime
      if(!point)throw new Error('Snapshot ausente')
      return {items:rows.filter(item=>item.document).map(item=>decodeDocument(item.document)),readTime:point}
    },
    async rankingPage(query) {
      if(!['latest','oldest','likes','relevant'].includes(query.mode)||query.limit!==15||query.gameId!==undefined&&!/^[\w-]{1,128}$/.test(query.gameId)||query.mode==='relevant'&&!/^[a-f0-9]{32}$/.test(query.generationId??'')||query.readTime!==undefined&&!Number.isFinite(Date.parse(query.readTime))||query.cursor&&(!(query.mode==='relevant'?/^[\w-]{1,192}$/:/^[\w-]{1,128}$/).test(query.cursor.id)||!Number.isFinite(Date.parse(query.cursor.time))||['likes','relevant'].includes(query.mode)&&(!Number.isFinite(query.cursor.value)||Number(query.cursor.value)<0)))throw new Error('Ordenação inválida')
      const relevant=query.mode==='relevant',collection=relevant?'rankingItems':'shorts',primary=query.mode==='likes'?'likeCount':'score',direction=query.mode==='oldest'?'ASCENDING':'DESCENDING'
      const filters=[{fieldFilter:{field:{fieldPath:relevant?'generationId':'moderationStatus'},op:'EQUAL',value:encode(relevant?query.generationId:'published')}},...(query.gameId?[{fieldFilter:{field:{fieldPath:'gameId'},op:'EQUAL',value:encode(query.gameId)}}]:[])]
      const orderBy=[...(['likes','relevant'].includes(query.mode)?[{field:{fieldPath:primary},direction:'DESCENDING'}]:[]),{field:{fieldPath:'createdAt'},direction},{field:{fieldPath:'__name__'},direction}]
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:collection}],select:{fields:(relevant?['shortId','gameId','createdAt','score']:['gameId','createdAt','likeCount','moderationStatus']).map(fieldPath=>({fieldPath}))},where:{compositeFilter:{op:'AND',filters}},orderBy,limit:15,...(query.cursor?{startAt:{before:false,values:[...(['likes','relevant'].includes(query.mode)?[encode(query.cursor.value)]:[]),encode(new Date(query.cursor.time)),{referenceValue:name(collection+'/'+query.cursor.id)}]}}:{})},...(query.readTime?{readTime:query.readTime}:{})})
      const rows=Array.isArray(result)?result:[result],point=query.readTime??rows.find(item=>item.readTime)?.readTime
      if(!point)throw new Error('Snapshot ausente')
      return {items:rows.filter(item=>item.document).map(item=>decodeDocument(item.document)),readTime:point}
    },
    async get(path) {
      const result = await request('batchGet', {documents:[name(path)]})
      const found = (Array.isArray(result) ? result : [result]).find(item => item.found)?.found
      return found ? decodeDocument(found).data : null
    },
    async adminListPage(query) {
      const filtersAllowed={games:['all','active','provisional','hidden','banned'],gameRequests:['pending','linked','rejected'],comments:['pending','approved','rejected','removed'],shorts:['pending','removed'],reportSummaries:['pending','reviewed']}
      if(!Object.hasOwn(filtersAllowed,query.kind)||!filtersAllowed[query.kind].includes(query.filter)||query.limit!==21)throw Error('Consulta administrativa inválida')
      listOrder(query.kind,query.filter,query.sort,query.cursor)
      const text=query.sort.startsWith('text-'),field=adminListFields[query.kind][text?'text':'date'],direction=query.sort.endsWith('-asc')?'ASCENDING':'DESCENDING'
      const statusField=query.kind==='games'||query.kind==='gameRequests'||query.kind==='reportSummaries'?'status':'moderationStatus'
      const filters=query.kind==='games'&&query.filter==='all'?[]:[{fieldFilter:{field:{fieldPath:statusField},op:query.kind==='games'&&query.filter==='hidden'?'IN':'EQUAL',value:encode(query.kind==='games'&&query.filter==='hidden'?['hidden','disabled','inactive']:query.filter==='provisional'?'active':query.filter)}},...(query.kind==='games'&&query.filter==='provisional'?[{fieldFilter:{field:{fieldPath:'reviewStatus'},op:'EQUAL',value:encode('provisional')}}]:[])]
      const selected={games:['officialName','status','reviewStatus','source','createdAt','reviewVersion'],gameRequests:['name','status','createdAt','revision','gameId','reason'],comments:['content','shortId','moderationStatus','createdAt','reviewVersion'],shorts:['title','moderationStatus','createdAt','administrativeBlock'],reportSummaries:['title','count','reviewedCount','firstReportedAt']}
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:query.kind}],select:{fields:selected[query.kind].map(fieldPath=>({fieldPath}))},...(filters.length?{where:{compositeFilter:{op:'AND',filters}}}:{}),orderBy:[{field:{fieldPath:field},direction},{field:{fieldPath:'__name__'},direction}],limit:21,...(query.cursor?{startAt:{before:false,values:[encode(text?query.cursor.value:new Date(query.cursor.value)),{referenceValue:name(query.kind+'/'+query.cursor.id)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async scanReportSummaries(after) {
      if(after!==undefined&&!/^[a-f0-9]{64}$/.test(after))throw Error('Cursor inválido')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'reportSummaries'}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,...(after?{startAt:{before:false,values:[{referenceValue:name('reportSummaries/'+after)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async gameCatalogPage(query) {
      if(!['all','active','provisional','hidden','banned'].includes(query.filter)||!Number.isSafeInteger(query.limit)||query.limit<1||query.limit>21||query.cursor&&(!/^[\w-]{1,128}$/.test(query.cursor.id)||!Number.isFinite(Date.parse(query.cursor.time))))throw new Error('Consulta de catálogo inválida')
      const filters = query.filter==='all'?[]:[{fieldFilter:{field:{fieldPath:'status'},op:query.filter==='hidden'?'IN':'EQUAL',value:encode(query.filter==='hidden'?['hidden','disabled','inactive']:query.filter==='provisional'?'active':query.filter)}},
        ...(query.filter==='provisional'?[{fieldFilter:{field:{fieldPath:'reviewStatus'},op:'EQUAL',value:encode('provisional')}}]:[])]
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'games'}],select:{fields:['officialName','status','reviewStatus','source','createdAt','reviewVersion'].map(fieldPath=>({fieldPath}))},
        ...(filters.length?{where:{compositeFilter:{op:'AND',filters}}}:{}),orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'},{field:{fieldPath:'__name__'},direction:'DESCENDING'}],limit:query.limit,
        ...(query.cursor?{startAt:{before:false,values:[encode(new Date(query.cursor.time)),{referenceValue:name('games/'+query.cursor.id)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async countGameShorts(gameId) {
      if(!/^[\w-]{1,128}$/.test(gameId))throw new Error('Jogo inválido')
      const result=await request('runAggregationQuery',{structuredAggregationQuery:{structuredQuery:{from:[{collectionId:'shorts'}],where:{fieldFilter:{field:{fieldPath:'gameId'},op:'EQUAL',value:encode(gameId)}}},aggregations:[{alias:'total',count:{}}]}})
      const rows=Array.isArray(result)?result:[result]
      const value=rows.find(row=>row.result?.aggregateFields?.total)?.result.aggregateFields.total
      const total=value?decode(value):null
      if(!Number.isSafeInteger(total)||Number(total)<0)throw new Error('Contagem indisponível')
      return Number(total)
    },
    async publicPage(query) {
      if (!['shorts','comments'].includes(query.kind) || !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > (query.kind === 'shorts' ? 30 : 21) || query.parentId !== undefined && !/^[\w-]{1,128}$/.test(query.parentId) || query.kind === 'comments' && !query.parentId || query.cursor && (!/^[\w-]{1,128}$/.test(query.cursor.id) || !Number.isFinite(Date.parse(query.cursor.time)))) throw new Error('Consulta pública inválida')
      const filters = [{fieldFilter:{field:{fieldPath:'moderationStatus'},op:'EQUAL',value:encode(query.kind === 'shorts' ? 'published' : 'approved')}},
        ...(query.parentId ? [{fieldFilter:{field:{fieldPath:query.kind === 'shorts' ? 'gameId' : 'shortId'},op:'EQUAL',value:encode(query.parentId)}}] : [])]
      const selected = query.kind === 'shorts' ? ['thumbnail','likeCount','commentCount','title','normalizedUrl','platform','platformVideoId','gameId','createdAt','channelName','moderationStatus'] : ['shortId','content','createdAt','moderationStatus','publicationNumber']
      if(query.kind==='comments'&&query.cursor&&(!Number.isSafeInteger(query.cursor.number)||Number(query.cursor.number)<1))throw Error('Atualize os comentários')
      const result = await request('runQuery',{structuredQuery:{from:[{collectionId:query.kind}],select:{fields:selected.map(fieldPath=>({fieldPath}))},where:{compositeFilter:{op:'AND',filters}},orderBy:[{field:{fieldPath:query.kind==='comments'?'publicationNumber':'createdAt'},direction:'DESCENDING'},{field:{fieldPath:'__name__'},direction:'DESCENDING'}],limit:query.limit,
        ...(query.cursor ? {startAt:{before:false,values:[query.kind==='comments'?encode(query.cursor.number):encode(new Date(query.cursor.time)),{referenceValue:name(query.kind+'/'+query.cursor.id)}]}} : {})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async scanLikeRecords(collection,after) {
      if(!['shortLikes','likeAttempts'].includes(collection)||after!==undefined&&!/^[a-f0-9]{64}$/.test(after))throw new Error('Página de retenção inválida')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:collection}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,
        ...(after?{startAt:{before:false,values:[{referenceValue:name(collection+'/'+after)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async scanGames(after) {
      if(after!==undefined&&!/^[\w-]{1,128}$/.test(after))throw new Error('Cursor inválido')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'games'}],select:{fields:['officialName','status','source'].map(fieldPath=>({fieldPath}))},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,
        ...(after?{startAt:{before:false,values:[{referenceValue:name('games/'+after)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>decodeDocument(item.document))
    },
    async scanShorts(after) {
      if(after!==undefined&&!/^[\w-]{1,128}$/.test(after))throw new Error('Cursor inválido')
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'shorts'}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:30,
        ...(after?{startAt:{before:false,values:[{referenceValue:name('shorts/'+after)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>({id:String(item.document.name).split('/').at(-1)!,data:Object.fromEntries(Object.entries(item.document.fields||{}).map(([key,value])=>[key,decode(value as Value)]))}))
    },
    async searchShorts(query) {
      if(typeof query.fragment!=='string'||![1,2,3].includes([...query.fragment].length)||!Number.isSafeInteger(query.limit)||query.limit<1||query.limit>30||query.gameId!==undefined&&!/^[\w-]{1,128}$/.test(query.gameId)||query.cursor&&(!/^[\w-]{1,128}$/.test(query.cursor.id)||!Number.isFinite(Date.parse(query.cursor.time))))throw new Error('Consulta de busca inválida')
      const filters=[{fieldFilter:{field:{fieldPath:'moderationStatus'},op:'EQUAL',value:encode('published')}},
        {fieldFilter:{field:{fieldPath:'searchFragments'},op:'ARRAY_CONTAINS',value:encode(query.fragment)}},
        ...(query.gameId?[{fieldFilter:{field:{fieldPath:'gameId'},op:'EQUAL',value:encode(query.gameId)}}]:[])]
      const result=await request('runQuery',{structuredQuery:{from:[{collectionId:'shorts'}],where:{compositeFilter:{op:'AND',filters}},
        select:{fields:['thumbnail','likeCount','commentCount','moderationStatus','title','normalizedUrl','platform','platformVideoId','gameId','createdAt','channelName'].map(fieldPath=>({fieldPath}))},
        orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'},{field:{fieldPath:'__name__'},direction:'DESCENDING'}],limit:query.limit,
        ...(query.cursor?{startAt:{before:false,values:[encode(new Date(query.cursor.time)),{referenceValue:name('shorts/'+query.cursor.id)}]}}:{})}})
      return (Array.isArray(result)?result:[result]).filter(item=>item.document).map(item=>({id:String(item.document.name).split('/').at(-1)!,data:Object.fromEntries(Object.entries(item.document.fields||{}).map(([key,value])=>[key,decode(value as Value)]))}))
    },
    async query(query) {
      const allowed = { gameRequests: ['status', 'createdAt'], comments: ['moderationStatus', 'createdAt'], shorts: ['moderationStatus', 'createdAt'], reportSummaries: ['status', 'lastReportedAt'], reports: ['shortId', 'createdAt'], moderationLogs: ['contentId', 'createdAt'] }
      const fieldsAllowed = allowed[query.collection]
      if (!fieldsAllowed || query.filter.field !== fieldsAllowed[0] || query.orderBy !== fieldsAllowed[1] ||
          !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 21) throw new Error('Consulta inválida')
      const start = query.cursor
      if (start && (!(query.collection === 'comments'||query.collection === 'moderationLogs' ? /^[\w-]{1,128}$/ : /^[a-f0-9]{64}$/).test(start.id) || !Number.isFinite(Date.parse(start.time)))) throw new Error('Cursor inválido')
      const result = await request('runQuery', { structuredQuery: {
        from: [{ collectionId: query.collection }],
        where: { fieldFilter: { field: { fieldPath: query.filter.field }, op: 'EQUAL', value: encode(query.filter.value) } },
        orderBy: [{ field: { fieldPath: query.orderBy }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
        limit: query.limit,
        ...(start ? { startAt: { before: false, values: [encode(new Date(start.time)), { referenceValue: name(query.collection + '/' + start.id) }] } } : {}),
      } })
      return (Array.isArray(result) ? result : [result]).filter(item => item.document).map(item => ({
        id: String(item.document.name).split('/').at(-1)!,
        data: Object.fromEntries(Object.entries(item.document.fields || {}).map(([key, value]) => [key, decode(value as Value)])),
      }))
    },
    async transact<T>(work: (transaction: AtomicTransaction) => Promise<T>): Promise<T> {
      let previous: string | undefined
      for (let attempt = 0; attempt < 8; attempt++) {
        const { transaction } = await request('beginTransaction', { options: { readWrite: previous ? { retryTransaction: previous } : {} } })
        const writes: unknown[] = []
        const port: AtomicTransaction = {
          async publishedCommentHistory(shortId) {
            if(writes.length)throw Error('Reads must precede writes')
            if(!/^[\w-]{1,128}$/.test(shortId))throw Error('Invalid short')
            const result=await request('runQuery',{transaction,structuredQuery:{from:[{collectionId:'comments'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'shortId'},op:'EQUAL',value:encode(shortId)}},{fieldFilter:{field:{fieldPath:'moderationStatus'},op:'IN',value:encode(['approved','removed'])}}]}},orderBy:[{field:{fieldPath:'createdAt'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:201}})
            return (Array.isArray(result)?result:[result]).filter(row=>row.document).map(row=>decodeDocument(row.document))
          },
          async hasPublishedComment(shortId) {
            if (writes.length) throw new Error('Todas as leituras devem preceder as gravações')
            if (!/^[\w-]{1,128}$/.test(shortId)) throw new Error('Vídeo inválido')
            const result = await request('runQuery', { transaction, structuredQuery: {
              from: [{ collectionId: 'comments' }], limit: 1,
              orderBy: [{field: {fieldPath: 'createdAt'}, direction: 'DESCENDING'}, {field: {fieldPath: '__name__'}, direction: 'DESCENDING'}],
              where: { compositeFilter: { op: 'AND', filters: [
                { fieldFilter: { field: { fieldPath: 'shortId' }, op: 'EQUAL', value: encode(shortId) } },
                { fieldFilter: { field: { fieldPath: 'moderationStatus' }, op: 'IN', value: encode(['approved', 'removed']) } },
              ] } },
            } })
            return (Array.isArray(result) ? result : [result]).some(item => item.document)
          },
          async get(path) {
            if (writes.length) throw new Error('Todas as leituras devem preceder as gravações')
            const result = await request('batchGet', { documents: [name(path)], transaction })
            const found = (Array.isArray(result) ? result : [result]).find(item => item.found)?.found
            return found ? Object.fromEntries(Object.entries(found.fields || {}).map(([key, value]) => [key, decode(value as Value)])) : null
          },
          create(path, data) { writes.push({ update: { name: name(path), fields: fields(data) }, currentDocument: { exists: false } }) },
          delete(path) { writes.push({delete:name(path),currentDocument:{exists:true}}) },
          set(path, data) { writes.push({ update: { name: name(path), fields: fields(data) } }) },
        }
        try {
          const result = await work(port)
          await request('commit', { writes, transaction })
          return result
        } catch (error) {
          if (!(error instanceof FirestoreError) || error.code !== 'ABORTED' || attempt === 7) {
            try { await request('rollback', { transaction }) } catch { /* Preserve original failure. */ }
            throw error
          }
          previous = transaction
          await new Promise(resolve => setTimeout(resolve, Math.random() * Math.min(1500, 100 * 2 ** attempt)))
        }
      }
      throw new Error('Transação não concluída')
    },
  }
}

