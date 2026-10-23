import clipperStyles from '../../../components/clipper/Clipper.module.css'
import { useAdminSession } from '../context/admin-session-context'
import { AdminSections } from '../components/AdminSections'
import styles from './AdminPage.module.css'
import { useEffect, useRef, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, getMultiFactorResolver, multiFactor,
  TotpMultiFactorGenerator,
} from 'firebase/auth'
import type { MultiFactorError, MultiFactorResolver, TotpSecret } from 'firebase/auth'
import { PageIntro } from '../../../components/ui/PageIntro'
function message(error: unknown): string {
  const code = (error as { code?: string })?.code
  const messages: Record<string, string> = {
    'auth/popup-blocked': 'Permita a janela de login Google e tente novamente.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase Authentication.',
    'auth/operation-not-allowed': 'O provedor Google ou TOTP ainda não foi habilitado no Firebase.',
    'auth/invalid-verification-code': 'Código inválido. Confira o aplicativo autenticador.',
    'auth/code-expired': 'Código expirado. Use o código atual do aplicativo.',
    'auth/requires-recent-login': 'Saia e entre novamente antes de cadastrar o autenticador.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde antes de tentar novamente.',
  }
  return code ? messages[code] || 'Não foi possível concluir a autenticação. Tente novamente.' :
    error instanceof Error && error.name === 'Error' ? error.message : 'Autenticação indisponível. Tente novamente.'
}
export function AdminPage() {
  const {auth,user,authorized,checking,error:sessionError,initialize,verify,invalidate,beginSignIn,endSession}=useAdminSession()
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null)
  const [secret, setSecret] = useState<TotpSecret | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Carregando autenticação...')
  const [working, setWorking] = useState(false)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    initialize().then(()=>{if(active.current)setStatus('')}).catch(failure=>{if(active.current){setError(message(failure));setStatus('')}})
    return()=>{active.current=false}
  },[initialize])
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true; setWorking(true); setError(''); invalidate()
    try { await work() } catch (failure) { if (active.current) setError(message(failure)) }
    finally { lock.current = false; if (active.current) setWorking(false) }
  }
  return <>
    <PageIntro title="Administração" description="Acesso exclusivo à conta autorizada, com Google e aplicativo autenticador." />
    {!authorized&&<aside className={styles.clipperGreeting} aria-label="Recado do Clipper"><img className={clipperStyles.floating} src="/clipper/welcome.webp" width="512" height="768" alt="" decoding="async"/><p>Estou online, totalmente operacional e, se me permite a audácia, torcendo pelo senhor como sempre.(J.A.R.V.I.S., 2013)</p></aside>}
    {!authorized && status && <p role="status">{status}</p>}
    {checking && <p role="status">Verificando acesso administrativo…</p>}
    {sessionError && <p role="alert" className="error">{sessionError}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {auth && !user && !resolver && <button className="primary" disabled={working} onClick={() => void run(async () => {
      beginSignIn()
      const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' })
      try { await signInWithPopup(auth, provider) }
      catch (failure) {
        if ((failure as { code?: string })?.code !== 'auth/multi-factor-auth-required') throw failure
        const challenge = getMultiFactorResolver(auth, failure as MultiFactorError)
        if (!challenge.hints.some(hint => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)) throw new Error('Esta conta não possui segundo fator TOTP disponível.', { cause: failure })
        if (active.current) { setResolver(challenge); setCode('') }
      }
    })}>Entrar com Google</button>}
    {user && <>
      <p>Conta conectada: {user.email}</p>
      <p>{authorized?'Acesso administrativo autorizado.':'Conta conectada. Aguardando autorização administrativa.'}</p>
      {!user.emailVerified && <p role="alert">Confirme seu e-mail antes de configurar o TOTP.</p>}
      {!multiFactor(user).enrolledFactors.some(factor => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID) && user.emailVerified && !secret &&
        <button disabled={working} onClick={() => void run(async () => {
          const generated = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession())
          if (active.current) { setSecret(generated); setCode(''); setStatus('Adicione a chave abaixo ao seu aplicativo autenticador.') }
        })}>Configurar aplicativo autenticador</button>}
      {secret && <div className="inset">
        <p>Adicione uma conta TOTP chamada Clipzone no aplicativo autenticador. A chave abaixo é privada; não envie pelo chat nem inclua em capturas.</p>
        <p>Chave de configuração: <code>{secret.secretKey}</code></p>
      </div>}
      {!secret && !authorized && <button disabled={working||checking} onClick={()=>void verify()}>Verificar acesso administrativo</button>}
    </>}
    {(resolver || secret) && <form className={styles.totpForm} onSubmit={event => {
      event.preventDefault()
      void run(async () => {
        if (resolver) {
          const factor = resolver.hints.find(hint => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)!
          await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(factor.uid, code))
          if (active.current) { setResolver(null); setCode(''); setStatus('') }
        } else if (secret && user) {
          await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Autenticador Clipzone')
          if (active.current) { setSecret(null); setCode('') }
          await endSession()
          if (active.current) setStatus('TOTP cadastrado. Entre novamente com Google e confirme o código para acessar.')
        }
      })
    }}>
      <label htmlFor="admin-totp">Código do aplicativo autenticador</label>
      <input id="admin-totp" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} disabled={working} />
      <button className="primary" disabled={working || code.length !== 6}>Confirmar código TOTP</button>
    </form>}
    {authorized && user && <AdminSections key={user.uid} user={user} onUnauthorized={()=>invalidate('A sessão administrativa não é mais válida. Verifique o acesso novamente.')} />}
    {auth && (user || resolver) && <button disabled={working} onClick={()=>void run(async()=>{
      await endSession();if(active.current){setResolver(null);setSecret(null);setCode('');setStatus('Sessão encerrada.')}
    })}>Sair / cancelar autenticação</button>}
    <p className="muted">O cadastro e os códigos do autenticador são tratados pelo Firebase. Esta página não concede acesso direto às coleções privadas.</p>
  </>
}
