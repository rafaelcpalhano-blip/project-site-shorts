import {GamePageNavigation} from '../components/GamePageNavigation'
import { lazy, Suspense } from 'react'
import { usesFirestore } from '../../../lib/firebase/mode'
const FirestoreGamePage = lazy(() => import('./FirestoreGamePage').then(module => ({ default: module.FirestoreGamePage })))
import { useParams } from 'react-router-dom'
import { PageIntro } from '../../../components/ui/PageIntro'
import { games } from '../../shorts/data/fixtures'
import { ShortFeed } from '../../shorts/components/ShortFeed'
export function GamePage() {
  const { gameId } = useParams()
  if (usesFirestore) return <Suspense fallback={<p role='status'>Carregando jogo...</p>}><FirestoreGamePage key={gameId} gameId={gameId || ''} /></Suspense>
  const game = games.find(item => item.id === gameId)
  if (!game) return <><PageIntro title="Jogo não encontrado" description="Este jogo não está no catálogo demonstrativo." /><GamePageNavigation/></>
  return <>
    <GamePageNavigation/>
    <PageIntro title={game.name} description="Catálogo demonstrativo. Descrição, imagens e demais informações serão obtidas de uma fonte oficial na etapa de integração." />
    <p className="muted">PROTÓTIPO · Shorts fictícios e dados apenas nesta sessão.</p>
    <ShortFeed key={game.id} gameId={game.id} />
  </>
}

