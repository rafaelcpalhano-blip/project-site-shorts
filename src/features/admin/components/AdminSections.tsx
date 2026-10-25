import {UpdatesPanel} from './UpdatesPanel'
import {AdminHistory} from './AdminHistory'
import {AdminBulkActions} from './AdminBulkActions'
import {useAdminBulk} from '../context/admin-bulk-context'
import styles from './AdminSections.module.css'
import {useState} from 'react'
import type {User} from 'firebase/auth'
import {GameCatalogPanel} from './GameCatalogPanel'

import {CommentModerationPanel} from './CommentModerationPanel'
import {ModerationPanel} from './ModerationPanel'
const labels={updates:'Atualizações',catalog:'Catálogo administrativo de jogos',comments:'Moderação de comentários',reports:'Denúncias e moderação de vídeos'} as const
type Section=keyof typeof labels
function AdminSectionPanels({user,onUnauthorized}:{user:User;onUnauthorized:()=>void}){
 const bulk=useAdminBulk()
 const [selected,setSelected]=useState<Section>('catalog'),[visited,setVisited]=useState<Section[]>(['catalog'])
 const [reviewId,setReviewId]=useState<{id:string;request:number}|undefined>()
 const panels={catalog:GameCatalogPanel,comments:CommentModerationPanel,reports:ModerationPanel}
 return <>
  <nav className={styles.navigation} aria-label="Seções administrativas">{(['updates','catalog','comments','reports'] as Section[]).map(id=><button key={id} type="button" aria-pressed={selected===id} aria-controls={'admin-section-'+id} disabled={bulk?.busy} onClick={()=>{bulk?.clear();setSelected(id);setVisited(current=>current.includes(id)?current:[...current,id])}}>{selected===id&&<span aria-hidden="true">✓ </span>}{labels[id]}</button>)}</nav>
  {visited.map(id=>{const Panel=id==='updates'?null:panels[id];return <div key={id} id={'admin-section-'+id} hidden={selected!==id}>{id==='updates'?<UpdatesPanel user={user} onUnauthorized={onUnauthorized} onReview={shortId=>{bulk?.clear();setReviewId(current=>({id:shortId,request:(current?.request??0)+1}));setSelected('reports');setVisited(current=>current.includes('reports')?current:[...current,'reports'])}}/>:id==='reports'?<ModerationPanel key={reviewId?.request} initialShortId={reviewId?.id} user={user} onUnauthorized={onUnauthorized}/>:Panel&&<Panel user={user} onUnauthorized={onUnauthorized}/>}</div>})}
  <AdminHistory user={user} onUnauthorized={onUnauthorized}/>
 </>
}

export function AdminSections(props:{user:User;onUnauthorized:()=>void}){return <AdminBulkActions {...props}><AdminSectionPanels {...props}/></AdminBulkActions>}
