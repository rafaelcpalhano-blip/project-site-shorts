import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { welcomePreference } from './welcome-preference'
import styles from './Clipper.module.css'
function storage() { try { return window.localStorage } catch { return undefined } }
export function ClipperWelcome() {
  const [open,setOpen] = useState(() => welcomePreference.shouldShow(storage()))
  const close = () => { welcomePreference.dismiss(storage()); setOpen(false) }
  if (!open) return null
  return <Modal title="Boas-vindas ao Clipzone!" onClose={close}>
    <div className={styles.welcome}>
      <img className={styles.floating} src="/clipper/welcome.png" width="1024" height="1536" alt="Clipper, o mascote do Clipzone, acenando" decoding="async" />
      <div><p>Oi, eu sou o Clipper!</p><p>Descubra jogadas, compartilhe shorts e participe com curtidas e comentários. Sem criar uma conta.</p><p>Ao compartilhar, escolha o jogo certo. Encontrou algo indevido? Use Denunciar.</p></div>
    </div>
    <div className="actions"><button className="primary" type="button" onClick={close}>Vamos explorar!</button></div>
  </Modal>
}
