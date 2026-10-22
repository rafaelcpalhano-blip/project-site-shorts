import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './AdminFilters.module.css'
export function AdminFilters<T extends string>({ labels, descriptions, value, disabled, onChange, order, refresh }: {
  labels: Record<T,string>; descriptions: Record<T,string>; value:T; disabled:boolean;
  onChange:(value:T)=>void; order:ReactNode; refresh:ReactNode
}) {
  const id=useId()
  const [hovered,setHovered]=useState<T|null>(null)
  const [focused,setFocused]=useState<T|null>(null)
  const [pointerPreview,setPointerPreview]=useState(false)
  const description=(pointerPreview?hovered??focused:focused??hovered)??value
  return <div className={styles.filters}>
    <div className={styles.toolbar}>
      {(Object.keys(labels) as T[]).map(key=><button key={key} type="button" disabled={disabled}
        aria-pressed={value===key} aria-describedby={id+'-'+key}
        onPointerEnter={event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){setHovered(key);setPointerPreview(true)}}}
        onPointerLeave={()=>setHovered(null)} onFocus={()=>{setFocused(key);setPointerPreview(false)}} onBlur={()=>setFocused(null)}
        onClick={()=>{if(!disabled)onChange(key)}}>{labels[key]}</button>)}
      {refresh}<div className={styles.order}>{order}</div>
    </div>
    <div className={styles.descriptions}>{(Object.keys(labels) as T[]).map(key=><p key={key} id={id+'-'+key} hidden={description!==key}>{descriptions[key]}</p>)}</div>
  </div>
}
