import {InstallAction} from '../pwa/InstallAction'
import {ClipperCommunity} from '../clipper/ClipperCommunity'
import {supportContact} from '../../config/support'
import styles from './SiteFooter.module.css'

export function SiteFooter({allowInstall = false}: {allowInstall?: boolean}) {
  return <footer className={styles.footer}>
    <ClipperCommunity />
    <div className={styles.information}>
      <p>Seu jogo não está no catálogo? Solicite a inclusão ao compartilhar um short. Para complementar a descrição, capa e outras informações, entre em contato com o suporte.</p>
      <details className={styles.explanation}><summary>Como os vídeos funcionam?</summary><p>Reunimos shorts que continuam hospedados nas plataformas originais. A reprodução usa players oficiais, e a contagem de visualizações segue as regras de cada plataforma.</p><p>O objetivo é descobrir criadores e jogos, sem incentivar visualizações artificiais.</p></details>
      <p className={styles.contact}>Suporte: <a href={'mailto:'+supportContact.email}>{supportContact.email}</a>.</p>
    </div>
    {allowInstall && <InstallAction />}
    <div className={styles.credits}>
      <p>Vídeos, jogos, marcas e imagens pertencem aos respectivos titulares. Os vídeos são incorporados pelas plataformas de origem.</p>
      <p>Feito para compartilhar jogadas. Respeito faz parte do jogo.</p>
    </div>
  </footer>
}
