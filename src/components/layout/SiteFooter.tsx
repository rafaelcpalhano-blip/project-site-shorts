import styles from './SiteFooter.module.css'

export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.community}>
      <img className={styles.clipper} src="/clipper/welcome.webp" width="512" height="768" alt="" loading="lazy" decoding="async" />
      <div className={styles.balloons}>
        <p className={styles.balloon}>Compartilhe suas melhores jogadas e descubra novos criadores!</p>
        <p className={styles.balloon}>Criou um jogo indie? Queremos ajudar a divulgar seu projeto!</p>
      </div>
    </div>
    <div className={styles.information}>
      <p>Seu jogo não está no catálogo? Solicite a inclusão ao compartilhar um short. Para complementar a descrição, capa e outras informações, entre em contato com o suporte.</p>
      <details className={styles.explanation}><summary>Como os vídeos funcionam?</summary><p>Reunimos shorts que continuam hospedados nas plataformas originais. A reprodução usa players oficiais, e a contagem de visualizações segue as regras de cada plataforma.</p><p>O objetivo é descobrir criadores e jogos, sem incentivar visualizações artificiais.</p></details>
      <p className={styles.contact}>Suporte: <span>teste.suporte@clipzone.com</span> — endereço de demonstração, ainda indisponível.</p>
    </div>
    <div className={styles.credits}>
      <p>Vídeos, jogos, marcas e imagens pertencem aos respectivos titulares. Os vídeos são incorporados pelas plataformas de origem.</p>
      <p>Feito para compartilhar jogadas. Respeito faz parte do jogo.</p>
    </div>
  </footer>
}
