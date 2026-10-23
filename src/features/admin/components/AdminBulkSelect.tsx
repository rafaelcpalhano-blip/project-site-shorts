import {useRef} from 'react'
import {useAdminBulk} from '../context/admin-bulk-context'
import {bulkLimit} from '../services/admin-bulk'
import type {BulkRow} from '../services/admin-bulk'
import styles from './ModerationPanel.module.css'
export function AdminBulkSelect({row,disabled,onChoose}:{row:BulkRow;disabled:boolean;onChoose?:()=>void}){
 const input=useRef<HTMLInputElement>(null)
 const bulk=useAdminBulk()
 if(!bulk)return null
 const key=row.kind+':'+row.id,checked=bulk.items.some(item=>item.key===key),done=bulk.completed.has(key)
 return <label className={styles.bulkSelection}><input ref={input} type="checkbox" checked={checked} disabled={disabled||bulk.busy||done||!checked&&bulk.items.length>=bulkLimit} onChange={event=>{if(event.target.checked)onChoose?.();void bulk.toggle(row,event.target.checked,()=>input.current?.focus())}}/><span className={styles.srOnly}>Selecionar {row.label||'registro'} para ação em lote</span>{done&&<span>Concluído · atualize a fila</span>}</label>
}
