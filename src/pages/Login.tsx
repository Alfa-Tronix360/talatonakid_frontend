import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { API_BASE, api, errMsg } from '@/lib/api'
import { Btn } from '@/components/ui'
import { IlustracaoAdmin, IlustracaoDocente, IlustracaoEncarregado } from '@/components/Ilustracoes'
import { Logo } from '@/components/Layout'

function ApiStatus() {
  const [st, setSt] = useState('')
  const testar = async () => {
    setSt('A testar…')
    try {
      const r = await fetch(`${API_BASE}/health`)
      setSt(r.ok ? 'Ligação ao servidor OK.' : `O servidor respondeu ${r.status}.`)
    } catch (e) {
      setSt(`Sem ligação: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return (
    <p className="mu" style={{ fontSize: 12, margin: 0, overflowWrap: 'anywhere' }}>
      Servidor: {API_BASE} · <button type="button" className="btn link" style={{ fontSize: 12 }} onClick={testar}>Testar ligação</button> {st}
    </p>
  )
}

const ESCOLA = (import.meta.env.VITE_ESCOLA_NOME as string | undefined) || 'Talatona Kids'

const ACESSOS = [
  { id: 'admin', titulo: 'Administração', sub: 'Direcção, secretaria e financeiro', Ilustracao: IlustracaoAdmin },
  { id: 'docente', titulo: 'Docente', sub: 'Notas, pautas, faltas e ocorrências', Ilustracao: IlustracaoDocente },
  { id: 'encarregado', titulo: 'Encarregado', sub: 'Portal do encarregado de educação', Ilustracao: IlustracaoEncarregado },
] as const

/** Fundo azul-escuro com a marca no topo (ecrã inicial, login e recuperação de senha). */
function AuthShell({ children, largo }: { children: ReactNode; largo?: boolean }) {
  return (
    <div className="entrada">
      <header className="entrada-marca"><Logo /><span>{ESCOLA.toUpperCase()}</span></header>
      <div className={largo ? 'entrada-largo' : 'entrada-caixa'}>{children}</div>
      <footer className="entrada-rodape">Copyright © {new Date().getFullYear()} {ESCOLA} | Todos os direitos reservados</footer>
    </div>
  )
}

/** Ecrã inicial: escolha do tipo de acesso, como no Exitus. */
function EscolhaAcesso() {
  const nav = useNavigate()
  return (
    <AuthShell largo>
      <h1 className="entrada-titulo">Bem-vindo à {ESCOLA}, escolha o seu tipo de acesso:</h1>
      <div className="acessos">
        {ACESSOS.map(({ id, titulo, sub, Ilustracao }) => (
          <section key={id} className="acesso">
            <h2>{titulo}</h2>
            <div className="acesso-img"><Ilustracao /></div>
            <p>{sub}</p>
            <button type="button" className="btn-acessar" onClick={() => nav(`/login?acesso=${id}`)}>
              <span aria-hidden="true">➜</span> Acessar
            </button>
          </section>
        ))}
      </div>
    </AuthShell>
  )
}

export function Login() {
  const { user, login, isPortal } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const acesso = ACESSOS.find((a) => a.id === sp.get('acesso'))
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [erro, setErro] = useState(() => {
    try {
      if (sessionStorage.getItem('clacs.expirada')) { sessionStorage.removeItem('clacs.expirada'); return 'A sessão expirou. Inicie sessão novamente.' }
    } catch { /* sem storage */ }
    return ''
  })
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={isPortal ? '/portal' : '/inicio'} replace />
  if (!acesso) return <EscolhaAcesso />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErro('')
    const r = await login(email, senha, needCode ? codigo : undefined)
    setBusy(false)
    if (r.ok) { nav('/', { replace: true }); return }
    if (r.needCode) setNeedCode(true)
    setErro(r.message)
  }

  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-ilustracao"><acesso.Ilustracao /></div>
        <h2>Acesso {acesso.titulo.toLowerCase()}</h2>
        <p className="sub" style={{ margin: 0 }}>{acesso.sub}</p>
        {erro && <div className="err" role="alert">{erro}</div>}
        <label className="fld"><span>E-mail</span>
          <input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="fld"><span>Palavra-passe</span>
          <input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {needCode && (
          <label className="fld"><span>Código de verificação (dois passos)</span>
            <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <small>Abra a aplicação autenticadora e introduza o código de 6 dígitos.</small>
          </label>
        )}
        <Btn type="submit" busy={busy}>Entrar</Btn>
        <div className="links"><Link to="/login">← Escolher outro acesso</Link><Link to="/recuperar">Esqueci a palavra-passe</Link></div>
        <ApiStatus />
      </form>
    </AuthShell>
  )
}

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErro('')
    try { await api.post('/auth/recuperar', { email: email.trim() }); setDone(true) } catch (x) { setErro(errMsg(x)) }
    setBusy(false)
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <h2>Recuperar palavra-passe</h2>
        {done ? (
          <div className="okm">Se o e-mail existir, enviámos um link para definir uma nova palavra-passe.</div>
        ) : (
          <>
            <p className="sub" style={{ margin: 0 }}>Indique o e-mail da sua conta. Enviamos um link para definir uma nova palavra-passe.</p>
            {erro && <div className="err" role="alert">{erro}</div>}
            <label className="fld"><span>E-mail</span>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <Btn type="submit" busy={busy}>Enviar link</Btn>
          </>
        )}
        <div className="links"><Link to="/login">Voltar ao início de sessão</Link></div>
      </form>
    </AuthShell>
  )
}

export function Redefinir() {
  const [sp] = useSearchParams()
  const [token, setToken] = useState(sp.get('token') || '')
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (senha !== conf) { setErro('As palavras-passe não coincidem.'); return }
    setBusy(true); setErro('')
    try { await api.post('/auth/redefinir', { token: token.trim(), senha_nova: senha }); setDone(true) } catch (x) { setErro(errMsg(x)) }
    setBusy(false)
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <h2>Nova palavra-passe</h2>
        {done ? (
          <div className="okm">Palavra-passe alterada. Já pode iniciar sessão.</div>
        ) : (
          <>
            {erro && <div className="err" role="alert">{erro}</div>}
            {!sp.get('token') && (
              <label className="fld"><span>Código recebido por e-mail</span>
                <input required value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
            )}
            <label className="fld"><span>Nova palavra-passe</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            <label className="fld"><span>Repetir palavra-passe</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={conf} onChange={(e) => setConf(e.target.value)} />
            </label>
            <Btn type="submit" busy={busy}>Guardar</Btn>
          </>
        )}
        <div className="links"><Link to="/login">Ir para o início de sessão</Link></div>
      </form>
    </AuthShell>
  )
}
