import { Link } from 'react-router-dom'
import { PageIntro } from './PageIntro'

export function NotFoundPage() {
  return (
    <>
      <PageIntro title="Página não encontrada" description="O endereço informado não corresponde a uma página deste site." />
      <Link to="/">Voltar ao início</Link>
    </>
  )
}
