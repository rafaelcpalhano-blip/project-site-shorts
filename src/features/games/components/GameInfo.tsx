import { gameLabel } from '../services/game-labels'
import type { GameDetails } from '../services/game-details'
import styles from './GameInfo.module.css'
export function GameInfo({game}:{game:GameDetails}) {
  return <section className={styles.card} aria-label="Informações do jogo">
    {game.imageUrl && <img className={styles.cover} src={game.imageUrl} alt={'Capa de '+game.name} loading="lazy" referrerPolicy="no-referrer" onError={event=>{event.currentTarget.hidden=true}} />}
    <div><h2>Sobre o jogo</h2>
      {game.source === 'manual' ? <>
        <p>Jogo cadastrado manualmente pela administração, sem cadastro associado à fonte IGDB. Descrição e imagem não disponíveis.</p>
        <p>Para solicitar informações e imagens de um jogo novo ou de sua autoria, o contato de suporte previsto é <strong>teste.suporte@clipzone.com</strong>.</p>
        <small>Suporte em preparação: este endereço ainda não existe e não recebe mensagens.</small>
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
