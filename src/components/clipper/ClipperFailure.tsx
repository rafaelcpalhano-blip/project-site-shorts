import type { ReactNode } from 'react'
import styles from './Clipper.module.css'
export function ClipperFailure({title='Não foi possível carregar',message='Ocorreu uma falha. Tente novamente em instantes.',children}: {title?:string;message?:string;children?:ReactNode}) {
  return <section className={styles.failure} aria-label={title}>
    <img src="/clipper/load-failure.png" width="1024" height="1536" alt="Clipper tentando resolver uma falha de carregamento" decoding="async" />
    <h1>{title}</h1><p role="alert">{message}</p><div className={styles.actions}>{children}</div>
  </section>
}
export function FatalPage() {
  return <main className={styles.fatal}><ClipperFailure><button type="button" onClick={()=>window.location.reload()}>Tentar novamente</button><a href="/">Voltar ao início</a></ClipperFailure></main>
}
