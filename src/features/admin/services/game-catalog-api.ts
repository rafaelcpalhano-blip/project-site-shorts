import {invalidateGameCatalog} from '../../games/services/catalog-cache.ts'
import type {ManualGameDetails} from '../../../lib/validation/manual-game-details'
import type {AdminSort,AdminListCursor} from '../types/list-order'
import type { User } from 'firebase/auth'
import { request } from './moderation-api.ts'
export type CatalogFilter='all'|'active'|'provisional'|'hidden'|'banned'
export type CatalogAction='approve'|'hide'|'ban'|'unban'|'restore'
export type CatalogCursor={time:string;id:string;scope:CatalogFilter}|AdminListCursor
export interface CatalogGame {id:string;name:string;source:string;status:string;provisional:boolean;createdAt:string|null;revision:number}
export interface CatalogPage {items:CatalogGame[];next:CatalogCursor|null}
export interface CatalogDetail {metadata:ManualGameDetails|null;game:CatalogGame;actions:CatalogAction[];shortCount:number|null;unbanTarget:string|null;historyLimited:boolean;history:Array<{id:string;action:string;reason:string|null;actorUid:string|null;createdAt:string|null}>}
export const fetchCatalog=(user:User,filter:CatalogFilter,cursor?:CatalogCursor,sort?:AdminSort)=>request<CatalogPage>(user,'games/catalog',{filter,cursor,sort})
export const fetchCatalogGame=(user:User,id:string)=>request<CatalogDetail>(user,'games/detail',{id})
export const moderateGame=async(user:User,detail:CatalogDetail,action:CatalogAction,reason:string)=>{
 const result=await request(user,'games/moderate',{id:detail.game.id,revision:detail.game.revision,action,reason,confirmed:true})
 invalidateGameCatalog();return result
}

export const saveManualGame=async(user:User,detail:CatalogDetail,details:ManualGameDetails,reason:string)=>{
 const result=await request(user,'games/edit',{id:detail.game.id,revision:detail.game.revision,details,reason,confirmed:true})
 invalidateGameCatalog();return result
}
