import {GameCover} from './GameCover'
import { supportEmailForDisplay } from '../../../config/support'
import { gameLabel } from '../services/game-labels'
import type { GameDetails } from '../services/game-details'
import styles from './GameInfo.module.css'
export function GameInfo({game}:{game:GameDetails}) {
  const supportEmail=supportEmailForDisplay(import.meta.env.DEV)
  return <section className={styles.card} aria-label="Informações do jogo">
    {game.imageUrl && <GameCover imageUrl={game.imageUrl} name={game.name}/>}
    <div><h2>Sobre o jogo</h2>
      {game.source === 'manual' ? <>
        <p>Informações cadastradas pela comunidade Clipzone.{game.provisional?' Cadastro provisório, sujeito à moderação posterior.':''} Sem cadastro associado à fonte IGDB.</p>
        <p className={styles.description}>{game.description || 'Descrição não disponível: jogo sem cadastro associado à fonte IGDB.'}</p>
        <p>Para solicitar informações e imagens de um jogo novo ou de sua autoria, entre em contato {supportEmail?<>pelo e-mail de suporte: <strong>{supportEmail}</strong>.</>:<>com o suporte.</>}</p>
      </> : <p className={styles.description}>{game.descriptionPtBr || game.description || 'Descrição não disponível no catálogo.'}</p>}
      {game.descriptionPtBr && <>
        <small>Tradução automática para português brasileiro; pode conter imprecisões.</small>
        <details><summary>Ver descrição original</summary><p className={styles.description}>{game.description}</p></details>
      </>}
      <dl className={styles.facts}>
        <dt>Lançamento</dt><dd>{game.releaseDate ? game.releaseDate.split('-').reverse().join('/') : 'Não informado'}</dd>
        <dt>Gêneros</dt><dd>{game.genres.map(value=>gameLabel(value,'genre')).join(', ') || 'Não informados'}</dd>
        <dt>Modos de jogo</dt><dd>{game.gameModes.map(value=>gameLabel(value,'mode')).join(', ') || 'Não informados'}</dd>
        <dt>Plataformas</dt><dd>{game.platforms.map(value=>gameLabel(value,'platform')).join(', ') || 'Não informadas'}</dd>
        {!!game.aliases.length && <><dt>Também conhecido como</dt><dd>{game.aliases.join(', ')}</dd></>}
      </dl>
      {game.source === 'IGDB' && <p>Dados de jogos: <a href={game.sourceUrl || 'https://www.igdb.com/'} target="_blank" rel="noopener noreferrer">IGDB</a>. Nomes oficiais preservados. Descrição traduzida automaticamente quando disponível.</p>}
    </div>
  </section>
}
