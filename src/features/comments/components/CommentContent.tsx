import styles from './CommentContent.module.css'
export function CommentContent({ content, number }: { content: string; number: number }) {
  return <span className={styles.comment}><span className={styles.number}>Comentário #{number}</span><span className={styles.content}>{content}</span></span>
}
