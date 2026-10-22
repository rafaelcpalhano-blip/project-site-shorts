import styles from './AdminSections.module.css'
import {useState} from 'react'
import type {User} from 'firebase/auth'
import {GameCatalogPanel} from './GameCatalogPanel'
import {GameRequestPanel} from './GameRequestPanel'
import {CommentModerationPanel} from './CommentModerationPanel'
import {ModerationPanel} from './ModerationPanel'
const labels={catalog:'Catálogo administrativo de jogos',requests:'Solicitações de jogos',comments:'Comentários e revisão de texto',reports:'Denúncias e revisão'} as const
type Section=keyof typeof labels
export function AdminSections({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}){
 const [selected,setSelected]=useState<Section>('catalog'),[visited,setVisited]=useState<Section[]>(['catalog'])
 const panels={catalog:GameCatalogPanel,requests:GameRequestPanel,comments:CommentModerationPanel,reports:ModerationPanel}
 return <>
  <nav className={styles.navigation} aria-label="Seções administrativas">{(Object.keys(labels) as Section[]).map(id=><button key={id} type="button" aria-pressed={selected===id} aria-controls={'admin-section-'+id} onClick={()=>{setSelected(id);setVisited(current=>current.includes(id)?current:[...current,id])}}>{selected===id&&<span aria-hidden="true">✓ </span>}{labels[id]}</button>)}</nav>
  {visited.map(id=>{const Panel=panels[id];return <div key={id} id={'admin-section-'+id} hidden={selected!==id}><Panel user={user} onUnauthorized={onUnauthorized}/></div>})}
 </>
}
