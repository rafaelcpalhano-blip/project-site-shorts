import {schedulePublicationDismiss} from '../services/publication-notice'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ClipperWelcome } from '../../../components/clipper/ClipperWelcome'
import { usesFirestore } from '../../../lib/firebase/mode'
const FirestoreFeed = lazy(() => import('../components/FirestoreFeed').then(module => ({ default: module.FirestoreFeed })))
const PersistentSubmissionDialog = lazy(() => import('../../submissions/components/PersistentSubmissionDialog').then(module => ({ default: module.PersistentSubmissionDialog })))
import { PageIntro } from '../../../components/ui/PageIntro'
import { ShortFeed } from '../components/ShortFeed'
import { FeedLoading } from '../components/FeedLoading'
import { SubmissionDialog } from '../../submissions/components/SubmissionDialog'
import styles from './HomePage.module.css'
export function HomePage() {
  const location=useLocation()
  return <HomeContent key={location.key} />
}
function HomeContent() {
  const shareButton=useRef<HTMLButtonElement>(null)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [feedVersion, setFeedVersion] = useState(0)
  useEffect(()=>schedulePublicationDismiss(message,()=>setMessage('')),[message,feedVersion])
  return <>
    <div className={styles.hero}>
      <PageIntro compact title="Pequenos clipes. Grandes jogadas."
        description="Descubra, compartilhe e comente. Sem criar uma conta." />
      <button ref={shareButton} className={"primary " + styles.shareButton} type="button" onClick={() => setSharing(true)}>+ Compartilhar short</button>
    </div>
    <ClipperWelcome onDismiss={()=>shareButton.current?.focus()} />
    {import.meta.env.DEV && <small className={styles.environment}>{usesFirestore?'Desenvolvimento · dados locais':'Desenvolvimento · modo demonstrativo'}</small>}
    {message && <p role="status" aria-live="polite" aria-atomic="true" className={message==='Short publicado.'?styles.success:undefined}>{message}</p>}
    <Suspense fallback={<FeedLoading />}>{usesFirestore ? <FirestoreFeed key={feedVersion} reset={feedVersion>0} /> : <ShortFeed key={feedVersion} />}</Suspense>
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
