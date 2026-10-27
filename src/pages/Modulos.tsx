import type { ComponentType } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import {
  IlustracaoAdmin, IlustracaoAluno, IlustracaoDocente, IlustracaoEncarregado, IlustracaoFinanceiro,
} from '@/components/Ilustracoes'
import { NAV, usePode } from '@/components/Layout'
import { nameOf } from '@/lib/data'
import { AuthShell } from '@/pages/Login'

const ILUSTRACOES: Record<string, ComponentType> = {
  Aluno: IlustracaoAluno, Financeiro: IlustracaoFinanceiro, Docente: IlustracaoDocente,
  'Comunicação': IlustracaoEncarregado, Administrador: IlustracaoAdmin,
}
const RESUMOS: Record<string, string> = {
  Aluno: 'Alunos, encarregados, matrículas e transporte',
  Financeiro: 'Propinas, pagamentos, refeitório e preços',
  Docente: 'Notas, pautas, faltas e ocorrências',
  'Comunicação': 'Mensagens, regras, alertas e assistente',
  Administrador: 'Utilizadores, perfis, auditoria e definições',
}

/** Depois de entrar, o administrador escolhe o módulo em que vai trabalhar (os módulos do menu, em quadros). */
export default function Modulos() {
  const { user, loading, isPortal, logout } = useAuth()
  const pode = usePode()
  const nav = useNavigate()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (isPortal) return <Navigate to="/portal" replace />

  const modulos = NAV.map((g) => ({ ...g, itens: g.items.filter(([, , m]) => pode(m)) })).filter((g) => g.itens.length)
  return (
    <AuthShell largo>
      <h1 className="entrada-titulo">Olá, {nameOf(user).split(' ')[0]}. Escolha o módulo:</h1>
      <div className="acessos modulos">
        {modulos.map((g) => {
          const Ilustracao = ILUSTRACOES[g.group] ?? IlustracaoAdmin
          return (
            <section key={g.group} className="acesso">
              <h2>{g.group}</h2>
              <div className="acesso-img"><Ilustracao /></div>
              <p>{RESUMOS[g.group] ?? g.itens.map(([, l]) => l).join(', ')}</p>
              <button type="button" className="btn-acessar" onClick={() => nav(g.itens[0][0])}>
                <span aria-hidden="true">➜</span> Acessar
              </button>
            </section>
          )
        })}
      </div>
      <nav className="modulos-links">
        <Link to="/inicio">Visão geral</Link>
        <Link to="/gestao">Gestão geral</Link>
        {pode('painel') && <Link to="/painel">Painel da direcção</Link>}
        <button type="button" onClick={() => { logout(); nav('/login', { replace: true }) }}>Sair</button>
      </nav>
    </AuthShell>
  )
}
