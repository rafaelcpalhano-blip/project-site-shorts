import {lazy, Suspense, useState, useSyncExternalStore} from 'react'
import {installController} from './install-controller'
import styles from './InstallAction.module.css'
const InstallGuide = lazy(() => import('./InstallGuide'))
const hidden = () => 'hidden' as const
const subscribe = (callback: () => void) => installController?.subscribe(callback) ?? (() => {})
export function InstallAction() {
  const mode = useSyncExternalStore(subscribe, installController?.getSnapshot ?? hidden, hidden)
  const [guide, setGuide] = useState<'ios' | 'android' | null>(null)
  const [pending, setPending] = useState(false)
  if (mode === 'hidden') return null
  return <>
    <div className={styles.slot}>
      <button className={styles.action} type="button" disabled={pending} aria-haspopup="dialog" onClick={async () => {
        setPending(true)
        try { if (await installController?.request() === 'guide') setGuide(mode === 'ios' ? 'ios' : 'android') }
        finally { setPending(false) }
      }}>
        <img src="/icons/clipper-gamer-64.webp" alt="" width="40" height="40" loading="lazy" decoding="async" />
        <span>Adicionar Clipzone à tela inicial</span>
      </button>
    </div>
    {guide && <Suspense fallback={<p role="status">Abrindo instruções…</p>}><InstallGuide platform={guide} onClose={() => setGuide(null)} /></Suspense>}
  </>
}
