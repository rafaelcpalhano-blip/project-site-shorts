import styles from './PageIntro.module.css'

interface PageIntroProps {
  title: string
  description: string
  eyebrow?: string
  compact?: boolean
}

export function PageIntro({ title, description, eyebrow, compact=false }: PageIntroProps) {
  return (
    <div className={styles.intro}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={compact?styles.compact:undefined}>{title}</h1>
      <p>{description}</p>
    </div>
  )
}
