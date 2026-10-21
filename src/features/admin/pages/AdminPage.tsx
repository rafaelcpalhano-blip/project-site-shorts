import { useEffect, useRef, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, signOut, getMultiFactorResolver, multiFactor,
  TotpMultiFactorGenerator, onIdTokenChanged,
} from 'firebase/auth'
import type { Auth, MultiFactorError, MultiFactorResolver, TotpSecret, User } from 'firebase/auth'
import { PageIntro } from '../../../components/ui/PageIntro'
import { loadAdminAuth, checkAdminAccess } from '../services/admin-auth'
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
  const [auth, setAuth] = useState<Auth | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null)
  const [secret, setSecret] = useState<TotpSecret | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Carregando autenticação...')
  const [working, setWorking] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    let unsubscribe: (() => void) | undefined
    loadAdminAuth().then(value => {
      if (!active.current) return
      setAuth(value); setStatus('')
      unsubscribe = onIdTokenChanged(value, current => {
        if (!active.current) return
        setUser(current); setAuthorized(false)
        if (!current) { setSecret(null); setCode('') }
      })
    }).catch(failure => { if (active.current) { setError(message(failure)); setStatus('') } })
    return () => { active.current = false; unsubscribe?.() }
  }, [])
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true; setWorking(true); setError(''); setAuthorized(false)
    try { await work() } catch (failure) { if (active.current) setError(message(failure)) }
    finally { lock.current = false; if (active.current) setWorking(false) }
  }
  return <>
    <PageIntro title="Administração" description="Acesso exclusivo à conta autorizada, com Google e aplicativo autenticador." />
    {status && <p role="status">{status}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {auth && !user && !resolver && <button className="primary" disabled={working} onClick={() => void run(async () => {
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
      <p className="muted">UID da sua conta: <code>{user.uid}</code>. Estar conectado não concede privilégios administrativos.</p>
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
      {!secret && <button disabled={working} onClick={() => void run(async () => {
        const uid = await checkAdminAccess(await user.getIdToken(true))
        if (active.current && uid === user.uid) { setAuthorized(true); setStatus('Identidade, TOTP e permissão confirmados pelo servidor. O painel de moderação será implementado na próxima etapa.') }
      })}>Verificar acesso administrativo</button>}
    </>}
    {(resolver || secret) && <form className="form" onSubmit={event => {
      event.preventDefault()
      void run(async () => {
        if (resolver) {
          const factor = resolver.hints.find(hint => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)!
          await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(factor.uid, code))
          if (active.current) { setResolver(null); setCode(''); setStatus('Login com TOTP concluído. Verifique o acesso no servidor.') }
        } else if (secret && user) {
          await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Autenticador Clipzone')
          if (active.current) { setSecret(null); setCode('') }
          await signOut(auth!)
          if (active.current) setStatus('TOTP cadastrado. Entre novamente com Google e confirme o código para acessar.')
        }
      })
    }}>
      <label htmlFor="admin-totp">Código do aplicativo autenticador</label>
      <input id="admin-totp" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} disabled={working} />
      <button className="primary" disabled={working || code.length !== 6}>Confirmar código TOTP</button>
    </form>}
    {authorized && <p role="status">Acesso administrativo verificado.</p>}
    {auth && (user || resolver) && <button disabled={working} onClick={() => void run(async () => {
      await signOut(auth); if (active.current) { setUser(null); setResolver(null); setSecret(null); setCode(''); setStatus('Sessão encerrada.') }
    })}>Sair / cancelar autenticação</button>}
    <p className="muted">O cadastro e os códigos do autenticador são tratados pelo Firebase. Esta página não concede acesso direto às coleções privadas.</p>
  </>
}
