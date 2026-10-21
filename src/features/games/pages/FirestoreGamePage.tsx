import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import { FirestoreFeed } from '../../shorts/components/FirestoreFeed'
import { PageIntro } from '../../../components/ui/PageIntro'
import type { GameDetails } from '../services/game-details'
import { GameInfo } from '../components/GameInfo'
export function FirestoreGamePage({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<GameDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    createPublicRepository(database).getGame(gameId).then(result => {
      if (active) { setGame(result); setLoading(false) }
    }).catch(() => { if (active) { setError('Jogo indisponível ou emulador desconectado.'); setLoading(false) } })
    return () => { active = false }
  }, [gameId])
  if (loading) return <p role="status">Carregando jogo...</p>
  if (!game || error) return <><p role="alert">{error || 'Jogo não encontrado.'}</p><Link to="/">Voltar ao início</Link></>
  return <><Link to="/">← Voltar ao início</Link><PageIntro title={game.name} description="Conheça o jogo e descubra as jogadas da comunidade." />
    <GameInfo game={game} /><FirestoreFeed key={game.id} gameId={game.id} /></>
}

