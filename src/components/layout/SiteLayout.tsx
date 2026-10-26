import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAdminSession } from '../../features/admin/context/admin-session-context'
import { useEffect, useRef } from 'react'
import styles from './SiteLayout.module.css'
import { SiteFooter } from './SiteFooter'

export function SiteLayout() {
  const { key, pathname } = useLocation()
  const { user, authorized, checking } = useAdminSession()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(key)

  useEffect(() => {
    if (previousPath.current !== key) {
      mainRef.current?.focus({preventScroll:true})
      previousPath.current = key
    }
  }, [key])

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Pular para o conteúdo</a>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="Clipzone — página inicial">
          clip<span>zone</span> ↗
        </Link>
        <p className={styles.tagline}>Comunidade de Games</p>
        {user && authorized && !checking && <NavLink className={"primary " + styles.adminLink} to="/admin">Administrar</NavLink>}
      </header>
      <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      {pathname!=='/admin'&&!pathname.startsWith('/admin/')&&<SiteFooter allowInstall={pathname === '/'} />}
    </div>
  )
}
