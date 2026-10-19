import { lazy, Suspense, useState } from 'react'
import { usesFirestore } from '../../../lib/firebase/mode'
const FirestoreFeed = lazy(() => import('../components/FirestoreFeed').then(module => ({ default: module.FirestoreFeed })))
import { PageIntro } from '../../../components/ui/PageIntro'
import { ShortFeed } from '../components/ShortFeed'
import { SubmissionDialog } from '../../submissions/components/SubmissionDialog'
import styles from './HomePage.module.css'
export function HomePage() {
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [feedVersion, setFeedVersion] = useState(0)
  return <>
    <div className={styles.hero}>
      <PageIntro eyebrow="Pequenos clipes. Grandes jogadas." title="O próximo GG está aqui."
        description="Descubra, compartilhe e comente. Sem criar uma conta." />
      <button className="primary" type="button" disabled={usesFirestore} onClick={() => setSharing(true)}>+ Compartilhar short</button>
    </div>
    <div className={styles.notice}>
      {usesFirestore ? <>FIRESTORE LOCAL · Leitura de dados do emulador. Publicação e comentários dependem das próximas etapas. Busca persistente ainda não definida.</> : <>
      PROTÓTIPO · Feed fictício. Publicações e comentários duram apenas nesta sessão; não são enviados a um servidor.
      <br />Reprodução simulada: links enviados abrem a origem real. Comentários enviados ficam pendentes.</>}
    </div>
    {message && <p role="status">{message}</p>}
    <Suspense fallback={<p role="status">Carregando fonte de dados...</p>}>{usesFirestore ? <FirestoreFeed /> : <ShortFeed key={feedVersion} />}</Suspense>
    {sharing && <SubmissionDialog onClose={() => setSharing(false)} onPublished={() => {
      setSharing(false); setFeedVersion(current => current + 1); setMessage('Short compartilhado nesta sessão.')
    }} />}
  </>
}

