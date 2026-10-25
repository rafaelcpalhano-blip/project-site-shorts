import type {User} from 'firebase/auth'
import {request} from './moderation-api'
export type UpdateCategory='all'|'published'|'reports'|'playback'
export interface UpdateCursor {time:string;id:string;scope:UpdateCategory}
export interface AdminUpdate {reportStatus:string;action:string;strongCount:number;signals:Record<string,number>;version:number;id:string;category:Exclude<UpdateCategory,'all'>;shortId:string;title:string;platform:string;gameName:string;createdAt:string;reason:string;count:number;contextCount:number;status:string;lastOccurrence:string;read:boolean;source:string|null}
export interface UpdatesPage {items:AdminUpdate[];next:UpdateCursor|null}
export const fetchUpdates=(user:User,category:UpdateCategory,cursor?:UpdateCursor)=>request<UpdatesPage>(user,'updates',{category,cursor})
export const markUpdateRead=(user:User,id:string,version:number)=>request<{id:string;read:boolean}>(user,'updates/read',{id,version})
