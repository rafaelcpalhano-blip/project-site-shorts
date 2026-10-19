import styles from './PageIntro.module.css'

interface PageIntroProps {
  title: string
  description: string
  eyebrow?: string
}

export function PageIntro({ title, description, eyebrow }: PageIntroProps) {
  return (
    <div className={styles.intro}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}
