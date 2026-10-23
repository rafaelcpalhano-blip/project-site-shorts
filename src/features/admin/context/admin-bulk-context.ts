import {createContext,useContext} from 'react'
import type {BulkItem,BulkRow} from '../services/admin-bulk'
export interface AdminBulkState {busy:boolean;items:BulkItem[];completed:Set<string>;toggle:(row:BulkRow,checked:boolean,returnFocus?:()=>void)=>Promise<void>;clear:()=>void}
export const AdminBulkContext=createContext<AdminBulkState|null>(null)
export const useAdminBulk=()=>useContext(AdminBulkContext)
