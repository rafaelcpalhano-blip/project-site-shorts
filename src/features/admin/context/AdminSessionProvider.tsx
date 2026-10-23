import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react'
import type {ReactNode} from 'react'
import type {Auth,User} from 'firebase/auth'
import {createAdminSession} from '../services/admin-session'
const loadAdminRuntime=()=>import('../services/admin-auth')
const checkAdminAccess=async(token:string)=>(await loadAdminRuntime()).checkAdminAccess(token)
import {AdminContext} from './admin-session-context'
export function AdminSessionProvider({children}:{children:ReactNode}){
 const [session]=useState(()=>createAdminSession<User>(checkAdminAccess)),state=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot)
 const [auth,setAuth]=useState<Auth|null>(null),subscription=useRef<(()=>void)|undefined>(undefined),active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false;subscription.current?.();subscription.current=undefined;session.dispose()}},[session])
 const initialize=useCallback(async()=>{
  const runtime=await loadAdminRuntime()
  const value=await runtime.loadAdminAuth()
  if(active.current){setAuth(value);if(!subscription.current)subscription.current=runtime.observeAdminAuth(value,user=>{session.setUser(user);if(user)void session.verify()})}
  return value
 },[session])
 useEffect(()=>{
  const visible=()=>{if(!document.hidden&&session.getSnapshot().user)void session.verify()}
  document.addEventListener('visibilitychange',visible)
  return()=>document.removeEventListener('visibilitychange',visible)
 },[session])
 const endSession=useCallback(async()=>{session.end();if(auth)await (await loadAdminRuntime()).signOutAdminAuth(auth)},[session,auth])
 return <AdminContext.Provider value={{...state,auth,initialize,verify:session.verify,invalidate:session.invalidate,beginSignIn:session.beginSignIn,endSession}}>{children}</AdminContext.Provider>
}
