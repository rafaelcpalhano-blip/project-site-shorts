import {useState} from 'react'
import {manualGameCoverUrl} from '../../../lib/validation/manual-game-details'
import styles from './GameInfo.module.css'
export function GameCover({imageUrl,name}:{imageUrl:string;name:string}){
 const [failed,setFailed]=useState('')
 const url=manualGameCoverUrl(imageUrl)
 if(!url||failed===url)return <p className={styles.coverFallback} role="status">Capa indisponível.</p>
 return <img className={styles.cover} src={url} alt={'Capa de '+name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(url)}/>
}
