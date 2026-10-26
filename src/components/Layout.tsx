import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { nameOf, pick, type Row } from '@/lib/data'
import { AuthImage } from './AuthImage'

/* ---------------------------------------------------------------- ícones do menu (traço simples) */
const PATHS: Record<string, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gestao: 'M4 6h16M4 12h16M4 18h16',
  painel: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  aluno: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  financeiro: 'M3 7h18v12H3zM3 11h18M7 15h3',
  docente: 'M3 5h18v11H3zM8 21l4-5 4 5M7 9h6',
  comunicacao: 'M4 5h16v11H8l-4 4z',
  admin: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  tema: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
}
export const Icone = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[n]} />
  </svg>
)

/* ---------------------------------------------------------------- menu (cada entrada: caminho, nome, módulo de permissão) */
type Item = [string, string, string?]
type Grupo = { group: string; icon: string; items: Item[] }

export const NAV: Grupo[] = [
  { group: 'Aluno', icon: 'aluno', items: [
    ['/alunos', 'Alunos', 'cadastro'], ['/encarregados', 'Encarregados', 'cadastro'], ['/matriculas', 'Matrículas', 'cadastro'],
    ['/pedidos', 'Pedidos dos encarregados', 'cadastro'], ['/transporte', 'Transporte', 'transporte'],
  ] },
  { group: 'Financeiro', icon: 'financeiro', items: [
    ['/cobrancas', 'Propinas e cobranças', 'propinas'], ['/pagamentos', 'Pagamentos', 'propinas'],
    ['/refeitorio', 'Refeitório e serviços', 'refeitorio'], ['/catalogo', 'Serviços e preços', 'propinas'],
  ] },
  { group: 'Docente', icon: 'docente', items: [
    ['/pedagogico/alunos', 'Alunos das turmas', 'pedagogico'], ['/avaliacoes', 'Avaliações e notas', 'pedagogico'],
    ['/pautas', 'Pautas', 'pedagogico'], ['/assiduidade', 'Assiduidade', 'pedagogico'], ['/ocorrencias', 'Ocorrências', 'pedagogico'],
    ['/registo-diario', 'Registo diário', 'pedagogico'], ['/avaliacao-professores', 'Avaliação dos professores', 'painel'],
  ] },
  { group: 'Comunicação', icon: 'comunicacao', items: [
    ['/mensagens', 'Mensagens e comunicados', 'comunicacao'], ['/regras', 'Regras e modelos', 'comunicacao'],
    ['/alertas', 'Alertas', 'painel'], ['/assistente', 'Assistente', 'painel'],
  ] },
  { group: 'Administrador', icon: 'admin', items: [
    ['/utilizadores', 'Utilizadores', 'utilizadores'], ['/perfis', 'Perfis e permissões', 'utilizadores'],
    ['/auditoria', 'Auditoria', 'utilizadores'], ['/definicoes', 'Definições da escola', 'academico'],
    ['/relatorios', 'Relatórios', 'painel'], ['/importacao', 'Importação de dados', 'importacao'],
    ['/primavera', 'Integração Primavera', 'primavera'],
  ] },
]

/** O utilizador vê o módulo? (admin vê tudo; os restantes pelas permissões "modulo:ver" do /auth/me). */
export function usePode() {
  const { user } = useAuth()
  const perms: string[] = Array.isArray(user?.permissoes) ? user!.permissoes : []
  const admin = (Array.isArray(user?.perfis) ? user!.perfis : []).includes('admin')
  return (modulo?: string) => !modulo || admin || perms.includes(`${modulo}:ver`)
}

export function useTheme() {
  const [t, setT] = useState<string>(() => {
    try { return localStorage.getItem('clacs.theme') || '' } catch { return '' }
  })
  useEffect(() => {
    if (t) document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
    try { t ? localStorage.setItem('clacs.theme', t) : localStorage.removeItem('clacs.theme') } catch { /* sem storage */ }
  }, [t])
  const toggle = () => {
    const dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)
    setT(dark ? 'light' : 'dark')
  }
  return toggle
}

/** Marca: um capelo estilizado em turquesa, como o logótipo do Exitus. */
export const Logo = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="3" y="3" width="58" height="58" rx="12" fill="none" stroke="#19c3b9" strokeWidth="3" />
    <path d="M12 27 32 17l20 10-20 10-20-10Zm8 8v8c0 3 6 6 12 6s12-3 12-6v-8l-12 6-12-6Z" fill="#19c3b9" />
    <circle cx="52" cy="27" r="2.5" fill="#19c3b9" /><path d="M52 27v12" stroke="#19c3b9" strokeWidth="2" />
  </svg>
)

export const nomeEscola = (user: Row | null) => String(pick(user, 'estabelecimento.nome') ?? 'Talatona Kids')

function grupoDe(pathname: string) {
  return NAV.find((g) => g.items.some(([to]) => pathname === to || pathname.startsWith(`${to}/`)))?.group
}

function Chev({ open }: { open: boolean }) {
  return (
    <svg className="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
      <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Fotografia (ou iniciais) do utilizador. */
export function Avatar({ user, size = 36 }: { user: Row | null; size?: number }) {
  const nome = nameOf(user) || 'Utilizador'
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  return (
    <span className="avatar-sm" style={{ width: size, height: size }}>
      <AuthImage src={pick(user, 'foto_url')} alt={`Fotografia de ${nome}`} fallback={iniciais} />
    </span>
  )
}

function Topo({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth()
  const toggleTheme = useTheme()
  return (
    <header className="topo">
      <button type="button" className="topo-btn" onClick={onMenu} aria-label="Mostrar ou esconder o menu">
        <Icone n="gestao" size={22} />
      </button>
      <span className="grow" />
      <button type="button" className="topo-btn" onClick={toggleTheme} aria-label="Alternar tema claro/escuro" title="Alternar tema">
        <Icone n="tema" />
      </button>
      <NavLink to="/conta" className="topo-user" title="O meu perfil">
        <Avatar user={user} />
        <b>{nameOf(user) || 'Utilizador'}</b>
      </NavLink>
      <button type="button" className="topo-btn" onClick={logout} aria-label="Terminar sessão" title="Terminar sessão">
        <Icone n="sair" />
      </button>
    </header>
  )
}

function Lado({ open, children }: { open: boolean; children: ReactNode }) {
  const { user } = useAuth()
  return (
    <aside className={`side ${open ? 'open' : ''}`} aria-label="Navegação principal">
      <div className="brand">
        <Logo />
        <div><b>{nomeEscola(user)}</b><small>Gestão escolar</small></div>
      </div>
      {children}
    </aside>
  )
}

export function Layout() {
  const loc = useLocation()
  const pode = usePode()
  const [aberto, setAberto] = useState(false)          // menu no telemóvel
  const [escondido, setEscondido] = useState(false)    // menu recolhido no computador
  const [grupoAberto, setGrupoAberto] = useState<string | undefined>(() => grupoDe(loc.pathname))
  useEffect(() => { setAberto(false) }, [loc.pathname])
  useEffect(() => { const g = grupoDe(loc.pathname); if (g) setGrupoAberto(g) }, [loc.pathname])
  const menu = () => (matchMedia('(max-width: 900px)').matches ? setAberto(true) : setEscondido((v) => !v))
  const nl = ({ isActive }: { isActive: boolean }) => `nl ${isActive ? 'active' : ''}`

  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      {aberto && <div className="scrim" onClick={() => setAberto(false)} />}
      <Lado open={aberto}>
        <NavLink to="/inicio" className={nl}><Icone n="home" /> Home</NavLink>
        <NavLink to="/gestao" className={nl}><Icone n="gestao" /> Gestão geral</NavLink>
        {pode('painel') && <NavLink to="/painel" className={nl}><Icone n="painel" /> Painel da direcção</NavLink>}
        <hr className="side-hr" />
        <div className="side-titulo">Navegação</div>
        {NAV.map((g) => {
          const itens = g.items.filter(([, , m]) => pode(m))
          if (!itens.length) return null
          const expandido = grupoAberto === g.group
          return (
            <div className="nav-group" key={g.group}>
              <button type="button" className={`nav-g-btn ${expandido ? 'expanded' : ''}`} aria-expanded={expandido}
                onClick={() => setGrupoAberto(expandido ? undefined : g.group)}>
                <span className="nav-g-l"><Icone n={g.icon} /> {g.group}</span>
                <Chev open={expandido} />
              </button>
              {expandido && (
                <nav aria-label={g.group} className="nav-sub">
                  {itens.map(([to, l]) => <NavLink key={to} to={to} className={nl}>{l}</NavLink>)}
                </nav>
              )}
            </div>
          )
        })}
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} />
        <main className="main" id="conteudo"><Outlet /></main>
      </div>
    </div>
  )
}

export function PortalLayout() {
  const loc = useLocation()
  const [aberto, setAberto] = useState(false)
  const [escondido, setEscondido] = useState(false)
  useEffect(() => { setAberto(false) }, [loc.pathname])
  const menu = () => (matchMedia('(max-width: 900px)').matches ? setAberto(true) : setEscondido((v) => !v))
  const nl = ({ isActive }: { isActive: boolean }) => `nl ${isActive ? 'active' : ''}`
  const items: [string, string, string][] = [
    ['/portal', 'Resumo', 'home'], ['/portal/cobrancas', 'Cobranças e pagamento', 'financeiro'],
    ['/portal/pagamentos', 'Pagamentos e recibos', 'financeiro'], ['/portal/pedidos', 'Pedidos à escola', 'docente'],
    ['/portal/mensagens', 'Mensagens', 'comunicacao'], ['/portal/preferencias', 'Preferências', 'config'],
  ]
  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      {aberto && <div className="scrim" onClick={() => setAberto(false)} />}
      <Lado open={aberto}>
        <div className="side-titulo">Portal do encarregado</div>
        {items.map(([to, l, ic]) => <NavLink key={to} to={to} end={to === '/portal'} className={nl}><Icone n={ic} /> {l}</NavLink>)}
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} />
        <main className="main" id="conteudo"><Outlet /></main>
      </div>
    </div>
  )
}
