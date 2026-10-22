import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { nameOf, pick } from '@/lib/data'

export const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'Direcção', items: [['/painel', 'Painel'], ['/alertas', 'Alertas'], ['/assistente', 'Assistente']] },
  { group: 'Secretaria', items: [['/alunos', 'Alunos'], ['/encarregados', 'Encarregados'], ['/matriculas', 'Matrículas'], ['/turmas', 'Turmas'], ['/academico', 'Estrutura académica']] },
  { group: 'Financeiro', items: [['/cobrancas', 'Propinas e cobranças'], ['/pagamentos', 'Pagamentos'], ['/refeitorio', 'Refeitório e serviços'], ['/catalogo', 'Serviços e preços']] },
  { group: 'Pedagógico', items: [['/avaliacoes', 'Avaliações e notas'], ['/pautas', 'Pautas'], ['/assiduidade', 'Assiduidade'], ['/ocorrencias', 'Ocorrências'], ['/registo-diario', 'Registo diário']] },
  { group: 'Comunicação', items: [['/regras', 'Regras e modelos'], ['/mensagens', 'Mensagens e comunicados']] },
  { group: 'Sistema', items: [['/primavera', 'Integração Primavera'], ['/importacao', 'Importação de dados'], ['/relatorios', 'Relatórios'], ['/utilizadores', 'Utilizadores'], ['/definicoes', 'Definições da escola'], ['/auditoria', 'Auditoria']] },
]

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

export const Logo = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#fff" fillOpacity=".16" />
    <path d="M12 26 32 16l20 10-20 10-20-10Zm8 8v8c0 3 6 6 12 6s12-3 12-6v-8l-12 6-12-6Z" fill="#fff" />
  </svg>
)

function groupOf(pathname: string) {
  return NAV.find((g) => g.items.some(([to]) => pathname === to || pathname.startsWith(`${to}/`)))?.group
}

function Chev({ open }: { open: boolean }) {
  return (
    <svg className="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
      <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const toggleTheme = useTheme()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const [grupoAberto, setGrupoAberto] = useState<string | undefined>(() => groupOf(loc.pathname) ?? NAV[0]?.group)
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    const g = groupOf(loc.pathname)
    if (g) setGrupoAberto(g)
  }, [loc.pathname])
  const perfil = pick(user, 'perfis.0.nome', 'perfis.0.codigo', 'perfis.0', 'perfil')

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">☰ Menu</button>
        <b>CLACS Escola</b>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? 'open' : ''}`} aria-label="Navegação principal">
        <div className="brand">
          <Logo />
          <div><b>CLACS Escola</b><small>Colégio Cota Lionel</small></div>
        </div>
        {NAV.map((g) => {
          const expandido = grupoAberto === g.group
          return (
            <div className="nav-group" key={g.group}>
              <button
                type="button"
                className={`nav-g-btn ${expandido ? 'expanded' : ''}`}
                aria-expanded={expandido}
                onClick={() => setGrupoAberto(expandido ? undefined : g.group)}
              >
                <span>{g.group}</span>
                <Chev open={expandido} />
              </button>
              {expandido && (
                <nav aria-label={g.group} className="nav-sub">
                  {g.items.map(([to, l]) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `nl ${isActive ? 'active' : ''}`}>{l}</NavLink>
                  ))}
                </nav>
              )}
            </div>
          )
        })}
        <span className="sp" />
        <NavLink to="/conta" className={({ isActive }) => `nl ${isActive ? 'active' : ''}`}>A minha conta</NavLink>
        <button type="button" className="nbtn" onClick={toggleTheme}>Alternar tema</button>
        <button type="button" className="nbtn" onClick={logout}>Terminar sessão</button>
        <div className="user-box">
          <b>{nameOf(user) || 'Utilizador'}</b>
          <span>{typeof perfil === 'object' ? nameOf(perfil) : perfil}</span>
        </div>
      </aside>
      <main className="main" id="conteudo">
        <Outlet />
      </main>
    </div>
  )
}

export function PortalLayout() {
  const { user, logout } = useAuth()
  const toggleTheme = useTheme()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname])
  const items: [string, string][] = [
    ['/portal', 'Resumo'], ['/portal/cobrancas', 'Cobranças e pagamento'], ['/portal/pagamentos', 'Pagamentos e recibos'],
    ['/portal/mensagens', 'Mensagens'], ['/portal/preferencias', 'Preferências'],
  ]
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">☰ Menu</button>
        <b>CLACS Escola</b>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? 'open' : ''}`} aria-label="Portal do encarregado">
        <div className="brand">
          <Logo />
          <div><b>Portal do Encarregado</b><small>Colégio Cota Lionel</small></div>
        </div>
        {items.map(([to, l]) => (
          <NavLink key={to} to={to} end={to === '/portal'} className={({ isActive }) => `nl ${isActive ? 'active' : ''}`}>{l}</NavLink>
        ))}
        <span className="sp" />
        <NavLink to="/conta" className={({ isActive }) => `nl ${isActive ? 'active' : ''}`}>A minha conta</NavLink>
        <button type="button" className="nbtn" onClick={toggleTheme}>Alternar tema</button>
        <button type="button" className="nbtn" onClick={logout}>Terminar sessão</button>
        <div className="user-box"><b>{nameOf(user)}</b><span>Encarregado de educação</span></div>
      </aside>
      <main className="main" id="conteudo">
        <Outlet />
      </main>
    </div>
  )
}
