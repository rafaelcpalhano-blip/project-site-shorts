import {createContext,useContext} from 'react'
import type {Auth,User} from 'firebase/auth'
import type {AdminSessionState} from '../services/admin-session'
export interface AdminSessionContext extends AdminSessionState<User> {
 auth:Auth|null;initialize:()=>Promise<Auth>;verify:()=>Promise<void>;invalidate:(error?:string)=>void
 beginSignIn:()=>void;endSession:()=>Promise<void>
}
export const AdminContext=createContext<AdminSessionContext|null>(null)
export function useAdminSession(){const value=useContext(AdminContext);if(!value)throw Error('AdminSessionProvider ausente');return value}
