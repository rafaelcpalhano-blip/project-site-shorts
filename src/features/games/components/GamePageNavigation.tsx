import {Link} from 'react-router-dom'
import {useAdminSession} from '../../admin/context/admin-session-context'
export function GamePageNavigation(){
 const admin=useAdminSession()
 return <nav aria-label="Navegação da ficha do jogo"><Link to="/">← Voltar ao início</Link>{admin.authorized&&admin.user&&<> · <Link to="/admin">Voltar ao painel administrativo</Link></>}</nav>
}
