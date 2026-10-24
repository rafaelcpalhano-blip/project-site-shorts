import {Link} from 'react-router-dom'
import {AdminBulkSelect} from './AdminBulkSelect'
import type {CatalogGame} from '../services/game-catalog-api'
import styles from './ModerationPanel.module.css'
export function CatalogGameRow({game,disabled,onChoose,onInspect}:{game:CatalogGame;disabled:boolean;onChoose:()=>void;onInspect:()=>void}){
 const visible=game.status==='active'
 const status=visible?(game.provisional?'Provisório':'Ativo'):game.status==='banned'?'Banido':'Oculto'
 return <li className={styles.catalogRow} aria-label={game.name}>
  <div className={styles.catalogSelection}><AdminBulkSelect disabled={disabled} onChoose={onChoose} row={{kind:'game',id:game.id,label:game.name,revision:game.revision,status:game.status}}/></div>
  <div className={styles.catalogInfo}><p><strong>{game.name}</strong><small style={{display:'block',overflowWrap:'anywhere'}}>ID: {game.id}</small></p><p className="muted">{game.source==='IGDB'?'IGDB':'Manual'} · {status} · {game.createdAt?new Date(game.createdAt).toLocaleString('pt-BR'):'Data não informada'}</p></div>
  <div className={styles.catalogConsult}>{visible?<Link className={styles.catalogLink} to={'/jogos/'+game.id}>Consultar jogo</Link>:<><button disabled={disabled} onClick={onInspect}>Consultar jogo</button><span className={styles.catalogNote}>Somente na administração</span></>}</div>
  <div className={styles.catalogActions}><button disabled={disabled} onClick={onInspect}>Detalhes administrativos</button></div>
 </li>
}
