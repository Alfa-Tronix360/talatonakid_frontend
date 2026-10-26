import { createBrowserRouter, Navigate, Outlet, useRouteError, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { useAuth } from '@/auth/AuthContext'
import { Layout, PortalLayout } from '@/components/Layout'
import { Loading } from '@/components/ui'
import { Login, Recuperar, Redefinir } from '@/pages/Login'

type Loader = () => Promise<{ default: React.ComponentType }>
const page = (load: Loader): RouteObject => ({
  lazy: async () => ({ Component: (await load()).default }),
})
const at = (path: string, load: Loader): RouteObject => ({ path, ...page(load) })

function RouteError() {
  const e = useRouteError() as { message?: string; statusText?: string } | undefined
  return (
    <div className="state err" style={{ minHeight: '60vh' }} role="alert">
      <b>Não foi possível mostrar esta página.</b>
      <span>{e?.message || e?.statusText || 'Erro inesperado.'}</span>
      <button type="button" className="btn" onClick={() => location.reload()}>Recarregar</button>
    </div>
  )
}

function Shell() {
  const { user, loading, isPortal } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Loading /></div>
  if (!user) return <Navigate to="/login" replace />
  return isPortal ? <PortalLayout /> : <Layout />
}

function Area({ portal }: { portal: boolean }) {
  const { isPortal } = useAuth()
  if (portal !== isPortal) return <Navigate to={isPortal ? '/portal' : '/inicio'} replace />
  return <Outlet />
}

function Home() {
  const { isPortal } = useAuth()
  return <Navigate to={isPortal ? '/portal' : '/inicio'} replace />
}

const staff: RouteObject[] = [
  at('inicio', () => import('@/pages/VisaoGeral')),
  at('gestao', () => import('@/pages/GestaoGeral')),
  at('perfis', () => import('@/pages/Perfis')),
  at('painel', () => import('@/pages/Painel')),
  at('alertas', () => import('@/pages/Alertas')),
  at('assistente', () => import('@/pages/Assistente')),
  at('avaliacao-professores', () => import('@/pages/AvaliacaoProfessores')),
  at('alunos', () => import('@/pages/Alunos')),
  at('alunos/:id', () => import('@/pages/AlunoDetalhe')),
  at('encarregados', () => import('@/pages/Encarregados')),
  at('matriculas', () => import('@/pages/Matriculas')),
  at('pedidos', () => import('@/pages/Pedidos')),
  at('transporte', () => import('@/pages/Transporte')),
  at('turmas', () => import('@/pages/Turmas')),
  at('academico', () => import('@/pages/Academico')),
  at('cobrancas', () => import('@/pages/Cobrancas')),
  at('pagamentos', () => import('@/pages/Pagamentos')),
  at('refeitorio', () => import('@/pages/Refeitorio')),
  at('catalogo', () => import('@/pages/Catalogo')),
  at('pedagogico/alunos', () => import('@/pages/AlunosPedagogico')),
  at('avaliacoes', () => import('@/pages/Avaliacoes')),
  at('pautas', () => import('@/pages/Pautas')),
  at('assiduidade', () => import('@/pages/Assiduidade')),
  at('ocorrencias', () => import('@/pages/Ocorrencias')),
  at('registo-diario', () => import('@/pages/RegistoDiario')),
  at('regras', () => import('@/pages/Regras')),
  at('mensagens', () => import('@/pages/Mensagens')),
  at('primavera', () => import('@/pages/Primavera')),
  at('importacao', () => import('@/pages/Importacao')),
  at('relatorios', () => import('@/pages/Relatorios')),
  at('utilizadores', () => import('@/pages/Utilizadores')),
  at('definicoes', () => import('@/pages/Definicoes')),
  at('auditoria', () => import('@/pages/Auditoria')),
]

const portal: RouteObject[] = [
  at('portal', () => import('@/portal/Resumo')),
  at('portal/educandos/:id', () => import('@/portal/Educando')),
  at('portal/cobrancas', () => import('@/portal/Cobrancas')),
  at('portal/pagamentos', () => import('@/portal/Pagamentos')),
  at('portal/pedidos', () => import('@/portal/Pedidos')),
  at('portal/mensagens', () => import('@/portal/Mensagens')),
  at('portal/preferencias', () => import('@/portal/Preferencias')),
]

const router = createBrowserRouter([
  { path: '/login', Component: Login },
  { path: '/recuperar', Component: Recuperar },
  { path: '/redefinir', Component: Redefinir },
  {
    path: '/',
    Component: Shell,
    ErrorBoundary: RouteError,
    children: [
      {
        // erros de página aparecem dentro do layout, mantendo o menu lateral
        ErrorBoundary: RouteError,
        children: [
          { index: true, Component: Home },
          at('conta', () => import('@/pages/Conta')),
          { element: <Area portal={false} />, children: staff },
          { element: <Area portal />, children: portal },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
