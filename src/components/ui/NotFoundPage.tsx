import { Link } from 'react-router-dom'
import { ClipperFailure } from '../clipper/ClipperFailure'
export function NotFoundPage() {
  return <ClipperFailure title="Página não encontrada" message="Este endereço não existe no Clipzone. Vamos voltar ao início?"><Link to="/">Voltar ao início</Link></ClipperFailure>
}
