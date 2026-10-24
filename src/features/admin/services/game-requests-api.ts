import {invalidateGameCatalog} from '../../games/services/catalog-cache.ts'
import type {AdminSort,AdminListCursor} from '../types/list-order'
import type { User } from 'firebase/auth'
import { request } from './moderation-api.ts'
export type RequestStatus='pending'|'linked'|'rejected'
export interface GameRequestItem {id:string;name:string;status:RequestStatus;createdAt:string;revision:number;gameId:string|null;reason:string}
export type RequestCursor={id:string;time:string}|AdminListCursor
export interface GameRequestPage {items:GameRequestItem[];next:RequestCursor|null}
export const fetchGameRequests=(user:User,status:RequestStatus,cursor?:RequestCursor,sort?:AdminSort)=>request<GameRequestPage>(user,'games/queue',{status,cursor,sort})
export type GameRequestTarget={kind:'igdb';gameId:string}|{kind:'manual';name:string}
export const reviewGameRequest=async(user:User,item:GameRequestItem,reason:string,target?:GameRequestTarget)=>{const result=await request(user,'games/review',{
 id:item.id,revision:item.revision,reason,...(target?.kind==='manual'?{action:'create',name:target.name}:target?.kind==='igdb'?{action:'link',gameId:target.gameId}:{action:'reject'})});if(target)invalidateGameCatalog();return result}
