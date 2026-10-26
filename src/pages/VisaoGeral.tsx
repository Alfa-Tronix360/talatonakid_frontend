import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { usePode } from '@/components/Layout'
import { Card, Empty, Loading } from '@/components/ui'
import { useAnoActivo } from '@/lib/academic'
import { nameOf, num, type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useList } from '@/lib/hooks'

const ESTADOS: [string, string, string][] = [
  ['activo', 'Activos', 'var(--teal)'], ['transferido', 'Transferidos', 'var(--wa)'],
  ['desistente', 'Desistentes', 'var(--er)'], ['concluido', 'Concluídos', 'var(--ac)'],
]
const ACCOES: Record<string, string> = { insert: 'Registo', update: 'Alteração', delete: 'Remoção', export: 'Documento', login: 'Entrada' }
const TABELAS: Record<string, string> = {
  aluno: 'aluno', matricula: 'matrícula', pagamento: 'pagamento', cobranca: 'cobranças', pedido: 'pedido',
  turma: 'turma', encarregado: 'encarregado', perfil: 'permissões', nota: 'notas', aluno_transporte: 'transporte',
}

const iniciais = (s: string) => s.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

/** Barras verticais simples: alunos por turma. */
function AlunosPorTurma({ turmas }: { turmas: Row[] }) {
  const max = Math.max(1, ...turmas.map((t) => num(t.alunos)))
  const w = 520, h = 210, base = 180, larg = Math.min(46, (w - 40) / Math.max(1, turmas.length) - 14)
  const passo = (w - 40) / Math.max(1, turmas.length)
  const ticks = [0, Math.round(max / 2), max]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Número de alunos por turma" className="grafico">
      {ticks.map((v) => {
        const y = base - (v / max) * 150
        return <g key={v}><line x1="34" x2={w} y1={y} y2={y} stroke="var(--ln)" /><text x="26" y={y + 4} textAnchor="end" fontSize="11" fill="var(--mu)">{v}</text></g>
      })}
      {turmas.map((t, i) => {
        const v = num(t.alunos), bh = (v / max) * 150, x = 40 + i * passo + (passo - larg) / 2
        return (
          <g key={t.id}>
            <title>{`${t.designacao}: ${v} aluno(s) de ${t.capacidade}`}</title>
            <rect x={x} y={base - bh} width={larg} height={Math.max(bh, 1)} rx="3" fill={t.cheia ? 'var(--er)' : '#2e3192'} />
            <text x={x + larg / 2} y={base - bh - 5} textAnchor="middle" fontSize="11" fill="var(--tx)" fontWeight="600">{v}</text>
            <text x={x + larg / 2} y={base + 16} textAnchor="middle" fontSize="11" fill="var(--mu)">{t.designacao}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function VisaoGeral() {
  const { user } = useAuth()
  const pode = usePode()
  const { ano } = useAnoActivo()
  const alunos = useList(pode('cadastro') ? '/alunos' : null, { limit: 2000 })
  const turmas = useList('/turmas')
  const matriculas = useList(pode('cadastro') ? '/matriculas' : null)
  const auditoria = useList(pode('utilizadores') ? '/auditoria' : null, { limit: 8 })
  const pedidos = useList(pode('cadastro') ? '/pedidos' : null, { estado: 'pendente' })

  const activos = alunos.rows.filter((a) => a.estado === 'activo').length
  const nee = alunos.rows.filter((a) => a.necessidade_especial).length
  const recentes = [...matriculas.rows].sort((a, b) => String(b.data_matricula).localeCompare(String(a.data_matricula)) || b.id - a.id).slice(0, 6)
  const porEstado = ESTADOS.map(([k, l, c]) => [l, c, alunos.rows.filter((a) => a.estado === k).length] as const)
  const totalEstados = porEstado.reduce((s, [, , n]) => s + n, 0) || 1
  const lugares = turmas.rows.reduce((s, t) => s + num(t.capacidade), 0)
  const ocupados = turmas.rows.reduce((s, t) => s + num(t.alunos), 0)

  return (
    <>
      <div className="page-h"><div><h2>Visão geral</h2><p className="sub">Olá, {nameOf(user).split(' ')[0] || 'bem-vindo'}. Resumo da escola no ano lectivo {ano?.designacao ?? ''}.</p></div></div>

      <div className="vg-kpis">
        <Card><div className="vg-kpi"><span>Alunos activos</span><b>{alunos.isLoading ? '…' : activos}</b>{nee > 0 && <small className="vg-nee">⚠ {nee} com necessidades especiais</small>}</div></Card>
        <Card><div className="vg-kpi"><span>Turmas</span><b>{turmas.rows.length}</b><small>{ocupados}/{lugares} lugares ocupados</small></div></Card>
        <Card><div className="vg-kpi"><span>Período lectivo</span><b>{ano?.designacao ?? '—'}</b><small>{ano ? `${dataPT(ano.data_inicio)} a ${dataPT(ano.data_fim)}` : ''}</small></div></Card>
        {pode('cadastro') && (
          <Card><Link to="/pedidos?estado=pendente" className="vg-kpi vg-link"><span>Pedidos por decidir</span><b className={pedidos.rows.length ? 'vg-alerta' : ''}>{pedidos.rows.length}</b><small>dos encarregados, no portal</small></Link></Card>
        )}
      </div>

      <div className="vg-grid">
        <Card title="Alunos por turma">
          {turmas.isLoading ? <Loading /> : turmas.rows.length ? <AlunosPorTurma turmas={turmas.rows} /> : <Empty>Sem turmas no ano lectivo activo.</Empty>}
        </Card>

        {pode('cadastro') && (
          <Card title="Matriculados recentemente" pad={false}>
            {matriculas.isLoading ? <Loading /> : recentes.length ? (
              <ul className="vg-lista">
                {recentes.map((m) => (
                  <li key={m.id}>
                    <span className="avatar-sm" style={{ width: 34, height: 34 }}>{iniciais(String(m.aluno))}</span>
                    <Link to={`/alunos/${m.aluno_id}`}>{m.aluno}</Link>
                    <span className="mu">{m.turma}</span>
                    <b>{String(m.data_matricula ?? '').slice(8, 10)}/{String(m.data_matricula ?? '').slice(5, 7)}</b>
                  </li>
                ))}
              </ul>
            ) : <Empty>Ainda não há matrículas.</Empty>}
          </Card>
        )}

        {pode('utilizadores') && (
          <Card title="Linha do tempo" pad={false}>
            {auditoria.isLoading ? <Loading /> : auditoria.rows.length ? (
              <ul className="vg-lista vg-tempo">
                {auditoria.rows.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <span className="avatar-sm" style={{ width: 34, height: 34, background: '#2e3192' }}>{iniciais(String(a.utilizador ?? 'Sistema'))}</span>
                    <span><b>{a.utilizador ?? 'Sistema'}</b> <span className="mu">— {dataPT(a.criado_em, true)}</span></span>
                    <span className="vg-etiqueta">{ACCOES[a.accao] ?? a.accao} · {TABELAS[a.tabela] ?? a.tabela}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Sem actividade registada.</Empty>}
          </Card>
        )}

        {pode('cadastro') && (
          <Card title="Situação dos alunos">
            {alunos.isLoading ? <Loading /> : (
              <>
                <div className="vg-barra" role="img" aria-label={porEstado.map(([l, , n]) => `${l}: ${n}`).join(', ')}>
                  {porEstado.filter(([, , n]) => n).map(([l, c, n]) => <i key={l} style={{ width: `${(n / totalEstados) * 100}%`, background: c }} title={`${l}: ${n}`} />)}
                </div>
                <ul className="vg-legenda">
                  {porEstado.map(([l, c, n]) => <li key={l}><i style={{ background: c }} />{l} <b>{n}</b></li>)}
                </ul>
              </>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
