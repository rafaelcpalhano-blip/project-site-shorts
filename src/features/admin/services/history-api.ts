import type {User} from 'firebase/auth'
import {request} from './moderation-api.ts'
export interface HistoryCursor {time:string;id:string;scope:string}
export type HistoryKind='game'|'game-request'|'comment'|'short'
export interface HistoryPage {items:{id:string;action:string;reason:string;actor:string;createdAt:string;previousStatus:string|null;nextStatus:string|null}[];next:HistoryCursor|null}
export const fetchAdminHistory=(user:User,kind:HistoryKind,id:string,cursor?:HistoryCursor)=>request<HistoryPage>(user,'history',{kind,id,cursor})
