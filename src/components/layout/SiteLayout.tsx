import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import styles from './SiteLayout.module.css'

export function SiteLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Pular para o conteúdo</a>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="Clipzone — página inicial">
          clip<span>zone</span> ↗
        </Link>
        <p className={styles.tagline}>Comunidade de Games</p>
      </header>
      <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        Feito para compartilhar jogadas. Respeito faz parte do jogo.
      </footer>
    </div>
  )
}
