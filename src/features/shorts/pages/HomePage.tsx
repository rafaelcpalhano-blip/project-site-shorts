import { lazy, Suspense, useState } from 'react'
import { usesFirestore } from '../../../lib/firebase/mode'
const FirestoreFeed = lazy(() => import('../components/FirestoreFeed').then(module => ({ default: module.FirestoreFeed })))
const PersistentSubmissionDialog = lazy(() => import('../../submissions/components/PersistentSubmissionDialog').then(module => ({ default: module.PersistentSubmissionDialog })))
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
      <PageIntro compact title="Pequenos clipes. Grandes jogadas."
        description="Descubra, compartilhe e comente. Sem criar uma conta." />
      <button className={"primary " + styles.shareButton} type="button" onClick={() => setSharing(true)}>+ Compartilhar short</button>
    </div>
    {import.meta.env.DEV && <small className={styles.environment}>{usesFirestore?'Desenvolvimento · dados locais':'Desenvolvimento · modo demonstrativo'}</small>}
    {message && <p role="status">{message}</p>}
    <Suspense fallback={<p role="status">Carregando fonte de dados...</p>}>{usesFirestore ? <FirestoreFeed key={feedVersion} /> : <ShortFeed key={feedVersion} />}</Suspense>
    {sharing && !usesFirestore && <SubmissionDialog onClose={() => setSharing(false)} onPublished={() => {
      setSharing(false); setFeedVersion(current => current + 1); setMessage('Short compartilhado nesta sessão.')
    }} />}
    {sharing && usesFirestore && <Suspense fallback={<p role="status">Carregando formulário...</p>}>
      <PersistentSubmissionDialog onClose={() => setSharing(false)} onSubmitted={result => {
        setSharing(false)
        if (result.status === 'published') setFeedVersion(current => current + 1)
        setMessage(result.status === 'published' ? 'Short publicado.' : 'Envio recebido para análise. Ele ainda não aparece no feed.')
      }} />
    </Suspense>}
  </>
}

