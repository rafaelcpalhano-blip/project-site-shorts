import styles from './CommentContent.module.css'
export function CommentContent({ content, number }: { content: string; number?: number }) {
  return <span className={styles.comment}><span className={styles.number}>{number!==undefined?'Comentário #'+number:'Comentário anterior à numeração'}</span><span className={styles.content}>{content}</span></span>
}
