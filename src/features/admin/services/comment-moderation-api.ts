import type {AdminSort,AdminListCursor} from '../types/list-order'
import type { User } from 'firebase/auth'
import { request } from './moderation-api.ts'
export type CommentStatus='pending'|'approved'|'rejected'|'removed'
export type CommentAction='approve'|'reject'|'remove'|'restore'
export type CommentCursor={time:string;id:string}|AdminListCursor
export interface CommentItem {id:string;shortId:string;content:string;status:CommentStatus;createdAt:string;revision:number}
export interface CommentPage {items:CommentItem[];next:CommentCursor|null}
export interface CommentDetail {comment:CommentItem;parent:{title:string;status:string};flags:string[];
  logs:{action:string;reason:string;createdAt:string}[]}
export const fetchCommentQueue=(user:User,status:CommentStatus,cursor?:CommentCursor,sort?:AdminSort)=>
  request<CommentPage>(user,'comments/queue',{status,cursor,sort})
export const fetchCommentDetail=(user:User,commentId:string)=>request<CommentDetail>(user,'comments/detail',{commentId})
export const sendCommentReview=(user:User,comment:CommentItem,action:CommentAction,reason:string)=>
  request<{id:string;status:CommentStatus}>(user,'comments/review',{commentId:comment.id,action,reason,revision:comment.revision})
