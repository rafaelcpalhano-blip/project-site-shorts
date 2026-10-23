import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { welcomePreference } from './welcome-preference'
import styles from './Clipper.module.css'
function storage() { try { return window.localStorage } catch { return undefined } }
export function ClipperWelcome({onDismiss}:{onDismiss?:()=>void}={}) {
  const [open,setOpen] = useState(() => welcomePreference.shouldShow(storage()))
  const close = () => { welcomePreference.dismiss(storage()); setOpen(false) }
  if (!open) return null
  return <Modal title="Oi, eu sou o Clipper!" onClose={close} hideCloseButton returnFocus={onDismiss}>
    <div className={styles.welcome}>
      <img className={styles.floating} src="/clipper/welcome.webp" width="512" height="768" alt="" decoding="async" />
      <div><p>Shorts de várias plataformas, juntos em um só lugar. Descubra criadores e jogos, sem criar uma conta.</p><p>Os vídeos continuam nas plataformas originais, em players oficiais. Cada plataforma define como contabiliza as visualizações.</p><button type="button" onClick={close}>Vamos explorar!</button></div>
    </div>
  </Modal>
}
