import {feedOrigin} from '../../shorts/services/feed-return'
import {Link,useLocation} from 'react-router-dom'
import {useAdminSession} from '../../admin/context/admin-session-context'
export function GamePageNavigation(){
 const admin=useAdminSession(),location=useLocation(),origin=feedOrigin(location.state)
 return <nav aria-label="Navegação da ficha do jogo"><Link to="/" replace={!!origin} state={origin?{feedReturn:origin}:null}>← Voltar ao início</Link>{admin.authorized&&admin.user&&<> · <Link to="/admin">Voltar ao painel administrativo</Link></>}</nav>
}
