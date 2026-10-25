import {paginationWindow} from '../services/pagination-window'
import styles from './ShortFeed.module.css'
export function FeedPagination({current,available,busy=false,canNext,nextLabel='Próxima →',onChange}:{current:number;available:number;busy?:boolean;canNext:boolean;nextLabel?:string;onChange:(page:number)=>void}){
 const window=paginationWindow(current,available)
 return <nav className={styles.pagination} aria-label="Paginação de shorts">
  {window.previousJump!==null&&<button type="button" disabled={busy} aria-label={'Voltar 5 páginas, ir para a página '+(window.previousJump+1)} onClick={()=>onChange(window.previousJump!)}>−5</button>}
  <button type="button" disabled={busy||current===0} onClick={()=>onChange(current-1)}>← Anterior</button>
  <span className={styles.pageNumbers}>
   {window.before&&<span aria-hidden="true">…</span>}
   {window.pages.map(position=><button key={position} type="button" disabled={busy||position===current} aria-label={'Página '+(position+1)} aria-current={position===current?'page':undefined} onClick={()=>onChange(position)}>{position+1}</button>)}
   {window.after&&<span aria-hidden="true">…</span>}
  </span>
  <button type="button" disabled={busy||!canNext} onClick={()=>onChange(current+1)}>{nextLabel}</button>
  {window.nextJump!==null&&<button type="button" disabled={busy} aria-label={'Avançar 5 páginas, ir para a página '+(window.nextJump+1)} onClick={()=>onChange(window.nextJump!)}>+5</button>}
 </nav>
}
