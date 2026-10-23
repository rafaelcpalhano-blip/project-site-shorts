import styles from './ShortFeed.module.css'

export function FeedLoading() {
  return <div className={styles.feed}><p role="status">Carregando fonte de dados...</p></div>
}
