import type {User} from 'firebase/auth'
import {fetchCatalogGame,moderateGame} from './game-catalog-api.ts'
import {reviewGameRequest} from './game-requests-api.ts'
import type {GameRequestItem} from './game-requests-api.ts'
import {fetchCommentDetail,sendCommentReview} from './comment-moderation-api.ts'
import {fetchDetail,sendReview,AdminRequestError} from './moderation-api.ts'
export const bulkLimit=5
export const bulkLabels={
 'game:approve':'Aprovar cadastros provisórios','game:hide':'Ocultar jogos','game:ban':'Banir jogos','game:unban':'Desbanir jogos','game:restore':'Ativar jogos ocultos',
 'request:create':'Aceitar como cadastros manuais','request:reject':'Rejeitar solicitações',
 'comment:approve':'Publicar comentários','comment:reject':'Rejeitar comentários','comment:remove':'Remover comentários','comment:restore':'Restaurar comentários',
 'video:dismiss':'Arquivar denúncias','video:block':'Bloquear vídeos','video:approve':'Publicar / desbloquear vídeos','video:remove':'Remover vídeos','video:restore':'Restaurar vídeos',
} as const
export type BulkAction=keyof typeof bulkLabels
export type BulkKind='game'|'request'|'comment'|'video'
export interface BulkRow {kind:BulkKind;id:string;label:string;revision?:number;status?:string;queue?:'reports'|'pending'|'removed';count?:number;reviewedCount?:number;request?:GameRequestItem}
export interface BulkItem {key:string;label:string;kind:BulkKind;actions:BulkAction[];apply:(action:BulkAction,reason:string)=>Promise<unknown>}
export interface BulkResult {key:string;label:string;status:'done'|'failed'|'not-run';message:string}
const changed=()=>new AdminRequestError('O registro mudou. Atualize a fila e confira antes de selecionar novamente.',false)
const actionKeys=(values:string[])=>values.filter((value):value is BulkAction=>Object.hasOwn(bulkLabels,value))
export function commonBulkActions(items:BulkItem[]):BulkAction[]{
 if(!items.length||items.some(item=>item.kind!==items[0].kind))return []
 return [...new Set(items[0].actions)].filter(action=>Object.hasOwn(bulkLabels,action)&&items.every(item=>item.actions.includes(action)))
}
export async function prepareBulkItem(user:User,row:BulkRow):Promise<BulkItem>{
 const base={key:row.kind+':'+row.id,label:row.label||'Vídeo '+row.id,kind:row.kind}
 if(row.kind==='game'){
  const detail=await fetchCatalogGame(user,row.id)
  if(detail.game.id!==row.id||detail.game.revision!==row.revision||detail.game.status!==row.status)throw changed()
  return {...base,actions:actionKeys(detail.actions.map(action=>'game:'+action)),apply:(action,reason)=>moderateGame(user,detail,action.slice(5) as Parameters<typeof moderateGame>[2],reason)}
 }
 if(row.kind==='request'){
  const item=row.request
  if(!item||item.id!==row.id||item.status!=='pending'||item.revision!==row.revision)throw changed()
  return {...base,actions:['request:create','request:reject'],apply:(action,reason)=>reviewGameRequest(user,item,reason,action==='request:create'?{kind:'manual',name:item.name}:undefined)}
 }
 if(row.kind==='comment'){
  const detail=await fetchCommentDetail(user,row.id),item=detail.comment
  if(item.id!==row.id||item.revision!==row.revision||item.status!==row.status||item.content!==row.label)throw changed()
  const publishable=detail.parent.status==='published'
  const actions=item.status==='pending'?[...(publishable?['comment:approve']:[]),'comment:reject']:item.status==='approved'?['comment:remove']:item.status==='rejected'&&publishable?['comment:approve']:item.status==='removed'&&publishable?['comment:restore']:[]
  return {...base,actions:actionKeys(actions),apply:(action,reason)=>sendCommentReview(user,item,action.slice(8) as Parameters<typeof sendCommentReview>[2],reason)}
 }
 const detail=await fetchDetail(user,row.id),item=detail.short
 if(item.id!==row.id||row.label&&item.title!==row.label||row.queue==='pending'&&item.status!=='pending'||row.queue==='removed'&&item.status!=='removed'||row.queue==='reports'&&(detail.count<=detail.reviewedCount||!['published','pending'].includes(item.status)||detail.count!==row.count||detail.reviewedCount!==(row.reviewedCount??0)))throw changed()
 const actions=item.status==='removed'?(item.restoreStatus?['video:restore']:[]):item.status==='published'||item.status==='pending'?[...(detail.count>detail.reviewedCount?['video:dismiss']:[]),...(item.status==='published'?['video:block']:['video:approve']),'video:remove']:[]
 return {...base,actions:actionKeys(actions),apply:(action,reason)=>sendReview(user,detail,action.slice(6) as Parameters<typeof sendReview>[2],reason)}
}
/** Sequential, bounded, no retries. Every apply reuses an authorized revision-checked endpoint. */
export async function runAdminBatch(items:BulkItem[],action:BulkAction,reason:string,canContinue:()=>boolean=()=>true,onResult:(result:BulkResult)=>void=()=>{}){
 if(!items.length||items.length>bulkLimit||new Set(items.map(item=>item.key)).size!==items.length||!commonBulkActions(items).includes(action)||reason.trim().length<5||reason.trim().length>500||/\p{C}/u.test(reason))throw Error('Lote inválido.')
 const results:BulkResult[]=[];let stopped=false,unauthorized=false
 for(const item of items){
  let result:BulkResult
  if(stopped||!canContinue()){stopped=true;result={key:item.key,label:item.label,status:'not-run',message:'Não iniciado.'}}
  else try{await item.apply(action,reason.trim());result={key:item.key,label:item.label,status:'done',message:'Decisão confirmada pelo servidor.'}}
  catch(error){stopped=true;unauthorized=error instanceof AdminRequestError&&error.unauthorized;result={key:item.key,label:item.label,status:'failed',message:error instanceof AdminRequestError?error.message:'Resultado não confirmado. Atualize a fila e confira o histórico antes de tentar novamente.'}}
  results.push(result);onResult(result)
 }
 return {results,unauthorized}
}
