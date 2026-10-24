import type {AtomicStore,RecordData,AdminListQuery} from '../firestore/atomic-store.ts'
import type {AdminSort,AdminListCursor} from '../../src/features/admin/types/list-order.ts'
import {ReviewError} from '../moderation/review-short.ts'
export const reportTitlesState='adminQueueState/reportTitles'
export const adminListFields={games:{text:'officialName',date:'createdAt'},gameRequests:{text:'name',date:'createdAt'},comments:{text:'content',date:'createdAt'},shorts:{text:'title',date:'createdAt'},reportSummaries:{text:'title',date:'firstReportedAt'}} as const
export type AdminListKind=keyof typeof adminListFields
export function listOrder(kind:AdminListKind,filter:string,sort:unknown,cursor:unknown):AdminListQuery{
 if(typeof sort!=='string'||!['date-desc','date-asc','text-asc','text-desc'].includes(String(sort)))throw new ReviewError('invalid-input',400)
 const order=sort as AdminSort,scope=[kind,filter,order].join(':'),text=order.startsWith('text-')
 const query:AdminListQuery={kind,filter,sort:order,limit:21}
 if(cursor!==undefined&&cursor!==null){
  if(typeof cursor!=='object'||Array.isArray(cursor)||Object.keys(cursor).some(key=>!['value','id','scope'].includes(key)))throw new ReviewError('invalid-input',400)
  const c=cursor as RecordData
  if(c.scope!==scope||typeof c.id!=='string'||!(kind==='games'||kind==='comments'?/^[\w-]{1,128}$/:/^[a-f0-9]{64}$/).test(c.id)||typeof c.value!=='string'||(text?c.value.length>500:/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(c.value)===false||!Number.isFinite(Date.parse(c.value))||new Date(c.value).toISOString()!==c.value))throw new ReviewError('invalid-input',400)
  query.cursor={id:c.id,value:c.value,scope}
 }
 return query
}
export async function loadAdminList(kind:AdminListKind,filter:string,sort:unknown,cursor:unknown,store:AtomicStore){
 const query=listOrder(kind,filter,sort,cursor)
 if(!store.adminListPage)throw new Error('query-unavailable')
 if(kind==='reportSummaries'&&query.sort.startsWith('text-')){const state=await store.transact(tx=>tx.get(reportTitlesState));if(state?.ready!==true||state.version!==1)throw new ReviewError('admin-order-preparing',503)}
 const rows=await store.adminListPage(query),shown=rows.slice(0,20),last=shown.at(-1),field=adminListFields[kind][query.sort.startsWith('text-')?'text':'date']
 let next:AdminListCursor|null=null
 if(rows.length>20&&last){const raw=last.data[field],value=query.sort.startsWith('text-')?raw:raw instanceof Date&&Number.isFinite(raw.getTime())?raw.toISOString():undefined;if(typeof value!=='string')throw Error('invalid-admin-order-value');next={value,id:last.id,scope:[kind,filter,query.sort].join(':')}}
 return {rows:shown,next}
}

export function filteredListCursor(cursor:unknown,kind:AdminListKind,filter:string,sort:AdminSort,selection:string) {
 if(cursor===undefined||cursor===null)return undefined
 const expected=[kind,filter,sort,selection].join(':')
 if(!cursor||typeof cursor!=='object'||Array.isArray(cursor)||(cursor as RecordData).scope!==expected)throw new ReviewError('invalid-input',400)
 const query=listOrder(kind,filter,sort,{...(cursor as RecordData),scope:[kind,filter,sort].join(':')})
 return query.cursor
}
export function filteredListNext(next:AdminListCursor|null,selection:string){return next?{...next,scope:next.scope+':'+selection}:null}
