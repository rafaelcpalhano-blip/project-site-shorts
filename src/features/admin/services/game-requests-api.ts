import type { User } from 'firebase/auth'
import { request } from './moderation-api'
export type RequestStatus='pending'|'linked'|'rejected'
export interface GameRequestItem {id:string;name:string;status:RequestStatus;createdAt:string;revision:number;gameId:string|null;reason:string}
export interface RequestCursor {id:string;time:string}
export interface GameRequestPage {items:GameRequestItem[];next:RequestCursor|null}
export const fetchGameRequests=(user:User,status:RequestStatus,cursor?:RequestCursor)=>request<GameRequestPage>(user,'games/queue',{status,cursor})
export type GameRequestTarget={kind:'igdb';gameId:string}|{kind:'manual';name:string}
export const reviewGameRequest=(user:User,item:GameRequestItem,reason:string,target?:GameRequestTarget)=>request(user,'games/review',{
 id:item.id,revision:item.revision,reason,...(target?.kind==='manual'?{action:'create',name:target.name}:target?.kind==='igdb'?{action:'link',gameId:target.gameId}:{action:'reject'})})
