import {lazy,Suspense} from 'react'

const AdminPage=lazy(()=>import('./AdminPage').then(module=>({default:module.AdminPage})))

export function AdminRoute() {
  return <Suspense fallback={<p role="status">Carregando administração...</p>}><AdminPage /></Suspense>
}
