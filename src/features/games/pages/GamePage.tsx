import { Link, useParams } from 'react-router-dom'
import { PageIntro } from '../../../components/ui/PageIntro'
import { games } from '../../shorts/data/fixtures'
import { ShortFeed } from '../../shorts/components/ShortFeed'
export function GamePage() {
  const { gameId } = useParams()
  const game = games.find(item => item.id === gameId)
  if (!game) return <><PageIntro title="Jogo não encontrado" description="Este jogo não está no catálogo demonstrativo." /><Link to="/">Voltar ao início</Link></>
  return <>
    <Link to="/">← Voltar ao início</Link>
    <PageIntro title={game.name} description="Catálogo demonstrativo. Descrição, imagens e demais informações serão obtidas de uma fonte oficial na etapa de integração." />
    <p className="muted">PROTÓTIPO · Shorts fictícios e dados apenas nesta sessão.</p>
    <ShortFeed key={game.id} gameId={game.id} />
  </>
}

