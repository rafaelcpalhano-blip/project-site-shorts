import {AdminHistory} from './AdminHistory'
import {AdminBulkActions} from './AdminBulkActions'
import {useAdminBulk} from '../context/admin-bulk-context'
import styles from './AdminSections.module.css'
import {useState} from 'react'
import type {User} from 'firebase/auth'
import {GameCatalogPanel} from './GameCatalogPanel'
import {GameRequestPanel} from './GameRequestPanel'
import {CommentModerationPanel} from './CommentModerationPanel'
import {ModerationPanel} from './ModerationPanel'
const labels={catalog:'Catálogo administrativo de jogos',requests:'Solicitações antigas',comments:'Moderação de comentários',reports:'Denúncias e moderação de vídeos'} as const
type Section=keyof typeof labels
function AdminSectionPanels({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}){
 const bulk=useAdminBulk()
 const [selected,setSelected]=useState<Section>('catalog'),[visited,setVisited]=useState<Section[]>(['catalog'])
 const panels={catalog:GameCatalogPanel,requests:GameRequestPanel,comments:CommentModerationPanel,reports:ModerationPanel}
 return <>
  <nav className={styles.navigation} aria-label="Seções administrativas">{(['catalog','comments','reports'] as Section[]).map(id=><button key={id} type="button" aria-pressed={selected===id} aria-controls={'admin-section-'+id} disabled={bulk?.busy} onClick={()=>{bulk?.clear();setSelected(id);setVisited(current=>current.includes(id)?current:[...current,id])}}>{selected===id&&<span aria-hidden="true">✓ </span>}{labels[id]}</button>)}</nav>
  <details><summary>Fluxo anterior de inclusão de jogos</summary><p>Novos jogos manuais são revisados no Catálogo, em Provisórios. Esta área preserva solicitações do fluxo anterior.</p><button type="button" aria-pressed={selected==='requests'} aria-controls="admin-section-requests" disabled={bulk?.busy} onClick={()=>{bulk?.clear();setSelected('requests');setVisited(current=>current.includes('requests')?current:[...current,'requests'])}}>Solicitações antigas</button></details>
  {visited.map(id=>{const Panel=panels[id];return <div key={id} id={'admin-section-'+id} hidden={selected!==id}><Panel user={user} onUnauthorized={onUnauthorized}/></div>})}
  <AdminHistory user={user} onUnauthorized={onUnauthorized}/>
 </>
}

export function AdminSections(props:{user:User;onUnauthorized:()=>void}){return <AdminBulkActions {...props}><AdminSectionPanels {...props}/></AdminBulkActions>}
