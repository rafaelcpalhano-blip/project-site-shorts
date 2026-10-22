import {useId} from 'react'
import type {AdminSort} from '../types/list-order'
export function AdminOrder({value,disabled,textLabel,dateLabel,onChange}:{value:AdminSort;disabled:boolean;textLabel:string;dateLabel:string;onChange:(sort:AdminSort)=>void}){
 const id=useId()
 return <div className="form-field"><label htmlFor={id}>Ordenar fila completa</label><select id={id} value={value} disabled={disabled} onChange={event=>onChange(event.target.value as AdminSort)}>
 <option value="date-desc">{dateLabel} — decrescente</option><option value="date-asc">{dateLabel} — crescente</option><option value="text-asc">{textLabel} — A a Z</option><option value="text-desc">{textLabel} — Z a A</option>
 </select></div>
}
