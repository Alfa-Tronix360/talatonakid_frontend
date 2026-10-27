import type { ComponentType } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import {
  IlustracaoAdmin, IlustracaoAluno, IlustracaoDireccao, IlustracaoDocente, IlustracaoEncarregado, IlustracaoFinanceiro,
} from '@/components/Ilustracoes'
import { MODULOS, escolherModulo, usePode } from '@/components/Layout'
import { nameOf } from '@/lib/data'
import { AuthShell } from '@/pages/Login'

const ILUSTRACOES: Record<string, ComponentType> = {
  'Direcção': IlustracaoDireccao,
  Aluno: IlustracaoAluno, Financeiro: IlustracaoFinanceiro, Docente: IlustracaoDocente,
  'Comunicação': IlustracaoEncarregado, Administrador: IlustracaoAdmin,
}
const RESUMOS: Record<string, string> = {
  'Direcção': 'Visão geral, gestão geral, painel e turmas',
  Aluno: 'Alunos, encarregados, matrículas e transporte',
  Financeiro: 'Propinas, pagamentos, refeitório e preços',
  Docente: 'Notas, pautas, faltas e ocorrências',
  'Comunicação': 'Mensagens, regras, alertas e assistente',
  Administrador: 'Utilizadores, perfis, auditoria e definições',
}

/** Depois de entrar, o administrador escolhe o módulo em que vai trabalhar; o menu lateral mostra só esse módulo.
 * É também aqui que o administrador termina a sessão. */
export default function Modulos() {
  const { user, loading, isPortal, logout } = useAuth()
  const pode = usePode()
  const nav = useNavigate()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (isPortal) return <Navigate to="/portal" replace />

  const modulos = MODULOS.map((g) => ({ ...g, itens: g.items.filter(([, , m]) => pode(m)) })).filter((g) => g.itens.length)
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
              <button type="button" className="btn-acessar" onClick={() => { escolherModulo(g.group); nav(g.itens[0][0]) }}>
                <span aria-hidden="true">➜</span> Acessar
              </button>
            </section>
          )
        })}
      </div>
      <button type="button" className="btn-sair-modulos" onClick={() => { escolherModulo(null); logout(); nav('/login', { replace: true }) }}>
        Terminar sessão
      </button>
    </AuthShell>
  )
}
