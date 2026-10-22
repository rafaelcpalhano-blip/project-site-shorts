import { useEffect, useState } from 'react'
import styles from './FirstCommentCelebration.module.css'
export function FirstCommentCelebration() {
  const [visible, setVisible] = useState(true)
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 2400); return () => window.clearTimeout(timer) }, [])
  if (!visible) return null
  return <div className={styles.celebration}>
    <p role="status">Você publicou o primeiro comentário deste vídeo! 🎉</p>
    <div className={styles.emojis} aria-hidden="true">{['🎉','✨','🎊','⭐','🎉','✨'].map((emoji,index)=><span key={index} style={{left:(8+index*16)+'%',animationDelay:(index*90)+'ms'}}>{emoji}</span>)}</div>
  </div>
}
