import styles from './ModerationPanel.module.css'
export function RefreshButton({label,disabled,onClick}:{label:string;disabled:boolean;onClick:()=>void}) {
 return <button type="button" className={styles.refresh} disabled={disabled} aria-label={label} title={label} onClick={onClick}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
   <path d="M20 7v5h-5" /><path d="M20 12a8 8 0 1 0-2.34 5.66M20 12l-2.34-5.66" />
  </svg>
 </button>
}
