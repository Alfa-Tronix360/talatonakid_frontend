import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Table, type Col } from '@/components/Table'
import { Btn, Card, Empty, ErrorBox, Kpi, Loading, PageHead, Select, Tag, fmtValue } from '@/components/ui'
import { asList, humanize, nameOf, num, pick, type Row } from '@/lib/data'
import { Kz, dataPT, label, pct, toneOf } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'
import { api } from '@/lib/api'

// Blocos devolvidos por /painel que já têm uma vista dedicada nesta página (evita duplicar como tabela genérica).
const BLOCOS_COM_VISTA_PROPRIA = ['por_turma', 'alertas', 'indicadores', 'kpis']

// Rotas que realmente existem no frontend — usado para validar o campo "destino" de um indicador
// antes de navegar (o backend por vezes aponta para caminhos de uma versão antiga, ex. "/propinas").
const ROTAS_CONHECIDAS = [
  '/painel', '/alertas', '/assistente', '/alunos', '/encarregados', '/matriculas', '/turmas', '/academico',
  '/cobrancas', '/pagamentos', '/refeitorio', '/catalogo', '/avaliacoes', '/pautas', '/assiduidade', '/ocorrencias',
  '/registo-diario', '/regras', '/mensagens', '/primavera', '/importacao', '/relatorios', '/utilizadores',
  '/definicoes', '/auditoria', '/conta',
]
function destinoValido(destino?: unknown): string | undefined {
  const d = typeof destino === 'string' ? destino : undefined
  if (!d) return undefined
  const base = d.split('?')[0]
  if (ROTAS_CONHECIDAS.includes(base)) return d
  if (base === '/propinas') return d.replace('/propinas', '/cobrancas') // nome antigo do módulo no backend
  return undefined
}

const MONEY = /valor|total|montante|divida|receb|preco|saldo|multa|atraso_valor|em_atraso$/i
function scalarKpis(obj: Row) {
  return Object.entries(obj).filter(([, v]) => v === null || ['number', 'string', 'boolean'].includes(typeof v))
}
function kpiValue(k: string, v: unknown) {
  if (typeof v === 'number') {
    if (/taxa|percent|pct/i.test(k)) return pct(v)
    if (MONEY.test(k)) return Kz(v)
    return v.toLocaleString('pt-PT')
  }
  return fmtValue(k, v)
}
/** Valor de um indicador configurável: usa sempre o `formato` devolvido pela API (kz/pct/num), nunca um palpite. */
function valorIndicador(i: Row) {
  const v = pick(i, 'valor', 'valor_hoje', 'resultado')
  if (v === null || v === undefined) return '—'
  const formato = pick(i, 'formato')
  if (formato === 'kz') return Kz(v)
  if (formato === 'pct') return pct(num(v))
  if (formato === 'num') return num(v).toLocaleString('pt-PT')
  return kpiValue(String(pick(i, 'codigo', 'nome') ?? ''), v)
}

// ============ Ícones discretos (sem biblioteca externa, consistentes com o Logo existente) ============
function IconCoin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.6v6.8M6 10c0 .8.9 1.3 2 1.3s2-.5 2-1.3-.9-1.1-2-1.3-2-.5-2-1.3S6.9 6.4 8 6.4s2 .5 2 1.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 13.5h11M4.5 13V8M8 13V4.5M11.5 13v-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconSync() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8a5 5 0 0 1 8.4-3.6M13 8a5 5 0 0 1-8.4 3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.4 2.8v1.9h-1.9M4.6 13.2v-1.9h1.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ============ KPIs executivos (secção 4) ============
type KpiKey = 'recebido_mes' | 'em_atraso' | 'alunos_em_incumprimento' | 'taxa_cobranca' | 'alunos' | 'facturado' | 'recebido'
const KPI_ORDEM: KpiKey[] = ['recebido_mes', 'em_atraso', 'alunos_em_incumprimento', 'taxa_cobranca', 'alunos', 'facturado', 'recebido']
const KPI_META: Record<KpiKey, { label: string; tone?: 'good' | 'bad' | 'warn'; goTo: string }> = {
  recebido_mes: { label: 'Recebido este mês', tone: 'good', goTo: '/cobrancas?estado=pago' },
  em_atraso: { label: 'Em atraso', tone: 'bad', goTo: '/cobrancas?estado=divida' },
  alunos_em_incumprimento: { label: 'Alunos em incumprimento', tone: 'bad', goTo: '/cobrancas?estado=divida' },
  taxa_cobranca: { label: 'Taxa de cobrança', goTo: '/cobrancas' },
  alunos: { label: 'Alunos matriculados', goTo: '/alunos' },
  facturado: { label: 'Facturado', goTo: '/cobrancas' },
  recebido: { label: 'Recebido (acumulado)', tone: 'good', goTo: '/cobrancas?estado=pago' },
}
function kpiHint(key: KpiKey, kpis: Row): string | undefined {
  const facturado = num(kpis.facturado)
  if (key === 'recebido_mes') return 'Competência do mês corrente'
  if (key === 'em_atraso' && facturado > 0) return `${pct((num(kpis.em_atraso) / facturado) * 100)} do facturado`
  if (key === 'alunos_em_incumprimento') return 'Com pelo menos uma cobrança vencida'
  if (key === 'recebido') return 'Todas as competências em aberto neste ano'
  if (key === 'facturado') return 'Total emitido no ano lectivo'
  return undefined
}
function kpiFormat(key: KpiKey, v: unknown) {
  if (v === null || v === undefined) return '—'
  if (key === 'taxa_cobranca') return pct(num(v))
  if (key === 'alunos' || key === 'alunos_em_incumprimento') return num(v).toLocaleString('pt-PT')
  return Kz(v)
}

function KpiSkeleton() {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div className="card kpi-sk" key={i}><span /><b /></div>
      ))}
    </div>
  )
}

// ============ Secção 5 — Facturado vs. Recebido vs. Em atraso ============
function DesempenhoCobranca({ facturado, recebido, emAtraso }: { facturado: number; recebido: number; emAtraso: number }) {
  if (!facturado) return <Empty>Sem dados de facturação para o período.</Empty>
  const linhas: [string, 'ac' | 'ok' | 'er', number][] = [
    ['Facturado', 'ac', facturado],
    ['Recebido', 'ok', recebido],
    ['Em atraso', 'er', emAtraso],
  ]
  return (
    <div className="chart-rows">
      {linhas.map(([nomeLinha, tom, valor]) => (
        <div className="chart-row chart-row-solo" key={nomeLinha}>
          <span className="chart-row-label static">{nomeLinha}</span>
          <div className="chart-row-bars">
            <div className="chart-bar-wrap" tabIndex={0} role="img" aria-label={`${nomeLinha}: ${Kz(valor)}`}>
              <div className={`chart-bar ${tom}`} style={{ width: `${Math.max(2, (valor / facturado) * 100)}%` }} />
              <span className="chart-bar-val">{Kz(valor)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ Secção 6 — Cobrança por turma (gráfico) ============
type TurmaBarra = { id: string; nome: string; facturado: number; recebido: number; emAtraso: number; alunos?: number; taxa?: number }

function turmaBarras(rows: Row[]): TurmaBarra[] {
  return rows
    .map((r) => ({
      id: String(pick(r, 'turma_id', 'turma', 'nome') ?? ''),
      nome: String(pick(r, 'turma', 'turma.designacao', 'designacao', 'nome') ?? ''),
      facturado: num(pick(r, 'facturado', 'valor_total', 'total')) || 0,
      recebido: num(pick(r, 'recebido', 'valor_pago', 'pago', 'total_pago')) || 0,
      emAtraso: num(pick(r, 'em_atraso', 'atraso', 'valor_atraso')) || 0,
      alunos: pick(r, 'alunos') as number | undefined,
      taxa: pick(r, 'taxa_cobranca', 'percentagem', 'percentual', 'pct', 'taxa') as number | undefined,
    }))
    .filter((x) => x.nome)
}

/**
 * Gráfico de barras agrupadas (Recebido vs. Em atraso, por turma), ordenado da taxa de cobrança
 * mais baixa para a mais alta — as turmas que precisam de atenção aparecem primeiro.
 * Cores de estado reutilizadas do resto da aplicação (--ok/--er), já usadas nas tags "paga"/"atraso":
 * aqui a série representa literalmente esse mesmo estado, não uma categoria arbitrária.
 */
function CobrancaTurmaChart({ items, go }: { items: TurmaBarra[]; go: (turma: string) => void }) {
  if (!items.length) return <Empty>Sem dados de cobrança por turma para o filtro seleccionado.</Empty>

  const ordenadas = [...items].sort((a, b) => num(a.taxa ?? 100) - num(b.taxa ?? 100))
  const piorTaxa = Math.min(...ordenadas.map((i) => num(i.taxa ?? 100)))
  const max = Math.max(1, ...items.flatMap((i) => [i.recebido, i.emAtraso]))
  const [foco, setFoco] = useState<string | null>(null)

  return (
    <>
      <div className="chart-legend" role="list" aria-label="Séries do gráfico">
        <span className="chart-legend-i" role="listitem"><i className="ok" /> Recebido</span>
        <span className="chart-legend-i" role="listitem"><i className="er" /> Em atraso</span>
      </div>
      <div className="chart-rows">
        {ordenadas.map((i) => {
          const precisaAtencao = i.taxa !== undefined && num(i.taxa) === piorTaxa
          return (
            <div className="chart-row" key={i.id || i.nome}>
              <button type="button" className="chart-row-label" onClick={() => go(i.nome)}>
                <span className="chart-row-label-top">
                  {i.nome}
                  {precisaAtencao && <Tag tone="wa">Atenção</Tag>}
                </span>
                {i.taxa !== undefined && <small>{pct(num(i.taxa))} cobrado{i.alunos !== undefined ? ` · ${i.alunos} aluno(s)` : ''}</small>}
              </button>
              <div className="chart-row-bars">
                {([['Recebido', 'ok', i.recebido], ['Em atraso', 'er', i.emAtraso]] as const).map(([serieLabel, tom, valor]) => {
                  const id = `${i.nome}-${tom}`
                  return (
                    <div
                      key={tom}
                      className="chart-bar-wrap"
                      tabIndex={0}
                      role="button"
                      aria-label={`${i.nome}, ${serieLabel}: ${Kz(valor)}`}
                      onClick={() => go(i.nome)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(i.nome) }}
                      onMouseEnter={() => setFoco(id)}
                      onMouseLeave={() => setFoco((f) => (f === id ? null : f))}
                      onFocus={() => setFoco(id)}
                      onBlur={() => setFoco((f) => (f === id ? null : f))}
                    >
                      <div className={`chart-bar ${tom}`} style={{ width: `${Math.max(2, (valor / max) * 100)}%` }} />
                      <span className="chart-bar-val">{Kz(valor)}</span>
                      {foco === id && (
                        <div className="chart-tip" role="tooltip">
                          <b>{i.nome}</b>
                          <span>{serieLabel}: {Kz(valor)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ============ Secção 7 — Composição da facturação (rosca Recebido / Em atraso) ============
function ComposicaoDonut({ facturado, recebido, emAtraso }: { facturado: number; recebido: number; emAtraso: number }) {
  // Só fazemos a rosca quando as partes somam o todo (dentro de 1%): caso contrário os valores
  // não são mutuamente exclusivos e um gráfico de partes-do-todo seria enganador.
  const soma = recebido + emAtraso
  const consistente = facturado > 0 && Math.abs(soma - facturado) <= Math.max(1, facturado * 0.01)
  if (!consistente) {
    if (facturado > 0) console.warn('[Painel] Recebido + Em atraso não bate com Facturado — verificar na origem.', { facturado, recebido, emAtraso })
    return <Empty>Sem uma base comum (facturado = recebido + em atraso) para compor o gráfico.</Empty>
  }
  const r = 54
  const circ = 2 * Math.PI * r
  const fracRecebido = recebido / facturado
  const dashRecebido = fracRecebido * circ

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`Facturado ${Kz(facturado)}: recebido ${pct(fracRecebido * 100)}, em atraso ${pct(100 - fracRecebido * 100)}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--ln)" strokeWidth="16" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="var(--er)" strokeWidth="16"
          strokeDasharray={`${circ} ${circ}`} transform="rotate(-90 70 70)"
        />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="var(--ok)" strokeWidth="16" strokeLinecap="butt"
          strokeDasharray={`${dashRecebido} ${circ - dashRecebido}`} transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" className="donut-val">{Kz(facturado)}</text>
        <text x="70" y="84" textAnchor="middle" className="donut-lbl">Facturado</text>
      </svg>
      <dl className="donut-legend">
        <div><dt><i className="ok" /> Recebido</dt><dd>{Kz(recebido)} <span className="mu">· {pct(fracRecebido * 100)}</span></dd></div>
        <div><dt><i className="er" /> Em atraso</dt><dd>{Kz(emAtraso)} <span className="mu">· {pct(100 - fracRecebido * 100)}</span></dd></div>
      </dl>
    </div>
  )
}

// ============ Secção 8 — Alertas inteligentes ============
function iconeAlerta(tipo: string) {
  if (tipo === 'queda_desempenho') return <IconChart />
  if (tipo === 'divergencia_primavera') return <IconSync />
  return <IconCoin />
}
function destinoAlerta(a: Row): string {
  const tipo = String(pick(a, 'tipo') ?? '')
  if (tipo === 'divergencia_primavera') return '/primavera'
  const alunoId = pick(a, 'aluno_id')
  return alunoId ? `/alunos/${alunoId}` : '/alertas'
}

type AlertasQuery = { rows: Row[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }

function AlertasPanel({ alertas, nav, tratar }: { alertas: AlertasQuery; nav: ReturnType<typeof useNavigate>; tratar: (id: number | string) => void }) {
  if (alertas.isLoading) return <Loading />
  if (alertas.isError) return <ErrorBox error={alertas.error} retry={() => alertas.refetch()} />
  if (!alertas.rows.length) return <Empty>Sem alertas por tratar. Tudo em ordem.</Empty>
  return (
    <div className="alerts-panel">
      {alertas.rows.slice(0, 8).map((a: Row, i: number) => {
        const tipo = String(pick(a, 'tipo') ?? '')
        const gravidade = pick(a, 'gravidade')
        return (
          <div className={`al-x tom-${toneOf(gravidade)}`} key={a.id ?? i}>
            <span className="al-x-icon">{iconeAlerta(tipo)}</span>
            <div className="al-x-body">
              <div className="al-x-top">
                <Tag tone={toneOf(gravidade)}>{label(gravidade)}</Tag>
                <span className="mu">{label(tipo)}</span>
              </div>
              <button type="button" className="al-x-msg" onClick={() => nav(destinoAlerta(a))}>
                {String(pick(a, 'mensagem', 'descricao', 'titulo', 'texto') ?? nameOf(a))}
              </button>
            </div>
            {a.id !== undefined && (
              <Btn variant="ghost" size="sm" onClick={() => tratar(a.id)}>Tratado</Btn>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============ Secção 11 — Análise e decisão ============
function Insights({ turmas, kpis, alertas }: { turmas: TurmaBarra[]; kpis: Row; alertas: Row[] }) {
  const pior = turmas.filter((t) => t.taxa !== undefined).sort((a, b) => num(a.taxa) - num(b.taxa))[0]
  const porTipo = new Map<string, number>()
  for (const a of alertas) {
    const t = String(pick(a, 'tipo') ?? 'outro')
    porTipo.set(t, (porTipo.get(t) ?? 0) + 1)
  }
  const linhas: string[] = []
  if (pior) linhas.push(`A turma ${pior.nome} apresenta a menor taxa de cobrança entre as ${turmas.length} turmas listadas: ${pct(num(pior.taxa))}.`)
  if (kpis.em_atraso !== undefined) {
    linhas.push(`Total em dívida: ${Kz(kpis.em_atraso)}${kpis.alunos_em_incumprimento !== undefined ? `, distribuído por ${kpis.alunos_em_incumprimento} aluno(s) em incumprimento` : ''}.`)
  }
  if (!linhas.length && !porTipo.size) return <Empty>Ainda não há dados suficientes para calcular observações.</Empty>
  return (
    <ul className="insights">
      {linhas.map((l) => <li key={l}>{l}</li>)}
      {[...porTipo].map(([tipo, n]) => <li key={tipo}>{label(tipo)}: {n} alerta(s) por tratar.</li>)}
    </ul>
  )
}

// ============ Secção 9 — Tabela executiva de cobrança por turma ============
type Ordem = 'taxa_asc' | 'taxa_desc' | 'atraso_desc' | 'nome'
const ORDEM_OPCOES: { value: Ordem; label: string }[] = [
  { value: 'taxa_asc', label: 'Taxa de cobrança (menor primeiro)' },
  { value: 'taxa_desc', label: 'Taxa de cobrança (maior primeiro)' },
  { value: 'atraso_desc', label: 'Em atraso (maior primeiro)' },
  { value: 'nome', label: 'Turma (A–Z)' },
]
function ordenarTurmas(items: TurmaBarra[], ordem: Ordem) {
  const a = [...items]
  if (ordem === 'taxa_asc') return a.sort((x, y) => num(x.taxa ?? 100) - num(y.taxa ?? 100))
  if (ordem === 'taxa_desc') return a.sort((x, y) => num(y.taxa ?? 0) - num(x.taxa ?? 0))
  if (ordem === 'atraso_desc') return a.sort((x, y) => y.emAtraso - x.emAtraso)
  return a.sort((x, y) => x.nome.localeCompare(y.nome, 'pt'))
}

export default function Painel() {
  const nav = useNavigate()
  const painel = useGet<Row>('/painel')
  const indic = useList('/indicadores')
  const alertas = useList('/alertas', { estado: 'novo' })

  const gerar = useAct(() => api.post('/alertas/gerar'), { invalidate: ['/alertas', '/painel'], ok: 'Alertas recalculados.' })
  const tratarAlerta = useAct((id: number | string) => api.patch(`/alertas/${id}`, { estado: 'tratado' }), { invalidate: ['/alertas', '/painel'], ok: 'Alerta marcado como tratado.' })

  const [turmaFiltro, setTurmaFiltro] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('taxa_asc')

  const data = painel.data && typeof painel.data === 'object' && !Array.isArray(painel.data) ? painel.data : {}
  const kpisObj: Row = pick(data, 'kpis') ?? {}
  const blocks = useMemo(
    () => Object.entries(data).filter(([k, v]) => v && typeof v === 'object' && !BLOCOS_COM_VISTA_PROPRIA.includes(k)),
    [data],
  )
  // /relatorios/cobranca-turma?formato=json ignora o formato e devolve sempre um ficheiro Excel:
  // o próprio /painel já traz a repartição por turma, sem pedido extra.
  const turmaRowsBrutas = asList(pick(data, 'por_turma'))
  const todasTurmas = useMemo(() => turmaBarras(turmaRowsBrutas), [turmaRowsBrutas])
  const turmasFiltradas = turmaFiltro ? todasTurmas.filter((t) => t.nome === turmaFiltro) : todasTurmas
  const turmasTabela = useMemo(() => ordenarTurmas(turmasFiltradas, ordem), [turmasFiltradas, ordem])

  const aActualizar = painel.isFetching || indic.isFetching || alertas.isFetching
  const actualizarTudo = () => { painel.refetch(); indic.refetch(); alertas.refetch() }

  const colsTurma: Col<TurmaBarra>[] = [
    { h: 'Turma', k: 'nome' },
    { h: 'Alunos', k: 'alunos', right: true },
    { h: 'Facturado', render: (r) => Kz(r.facturado), right: true },
    { h: 'Recebido', render: (r) => Kz(r.recebido), right: true },
    { h: 'Em atraso', render: (r) => Kz(r.emAtraso), right: true },
    { h: 'Taxa', render: (r) => r.taxa !== undefined ? <span className={r.taxa === Math.min(...todasTurmas.map((t) => num(t.taxa ?? 100))) ? 'mu' : ''}><b>{pct(num(r.taxa))}</b></span> : '—', right: true },
    { h: 'Ações', render: (r) => <Btn variant="ghost" size="sm" onClick={() => nav(`/cobrancas?turma=${encodeURIComponent(r.nome)}`)}>Ver</Btn> },
  ]

  return (
    <>
      <PageHead
        title="Painel da Direcção"
        sub="Visão executiva da situação financeira, cobrança e desempenho escolar."
        actions={(
          <>
            <Btn variant="ghost" busy={aActualizar} onClick={actualizarTudo}>Actualizar</Btn>
            <Btn variant="ghost" busy={gerar.isPending} onClick={() => gerar.mutate()}>Recalcular alertas</Btn>
          </>
        )}
      />
      <p className="sub painel-meta">
        Situação em {dataPT(pick(data, 'data') ?? new Date().toISOString())}
        {pick(data, 'ano_lectivo') && <> · Ano lectivo <b>{pick(data, 'ano_lectivo')}</b></>}
        {painel.dataUpdatedAt ? <> · Actualizado às {dataPT(new Date(painel.dataUpdatedAt).toISOString(), true).split(', ').pop()}</> : null}
      </p>

      {painel.isLoading && <KpiSkeleton />}
      {painel.isError && <Card><ErrorBox error={painel.error} retry={() => painel.refetch()} /></Card>}

      {!painel.isLoading && !painel.isError && (
        <div className="grid">
          {KPI_ORDEM.filter((k) => kpisObj[k] !== undefined).map((k) => (
            <Kpi
              key={k}
              label={KPI_META[k].label}
              value={kpiFormat(k, kpisObj[k])}
              tone={KPI_META[k].tone}
              hint={kpiHint(k, kpisObj)}
              onClick={() => nav(KPI_META[k].goTo)}
            />
          ))}
        </div>
      )}

      {!painel.isLoading && !painel.isError && (kpisObj.facturado !== undefined) && (
        <Card title="Desempenho da cobrança" className="mt" pad>
          <DesempenhoCobranca facturado={num(kpisObj.facturado)} recebido={num(kpisObj.recebido)} emAtraso={num(kpisObj.em_atraso)} />
        </Card>
      )}

      <div className="two mt">
        <Card
          title="Cobrança por turma"
          actions={todasTurmas.length > 1 ? (
            <Select label="Filtrar por turma" value={turmaFiltro} onChange={setTurmaFiltro} placeholder="Todas as turmas"
              options={todasTurmas.map((t) => ({ value: t.nome, label: t.nome }))} />
          ) : undefined}
        >
          {painel.isLoading ? <Loading /> : painel.isError ? <ErrorBox error={painel.error} retry={() => painel.refetch()} /> : (
            <CobrancaTurmaChart items={turmasFiltradas} go={(t) => nav(`/cobrancas?turma=${encodeURIComponent(t)}`)} />
          )}
        </Card>

        <Card title="Composição da facturação">
          {painel.isLoading ? <Loading /> : (kpisObj.facturado !== undefined ? (
            <ComposicaoDonut facturado={num(kpisObj.facturado)} recebido={num(kpisObj.recebido)} emAtraso={num(kpisObj.em_atraso)} />
          ) : <Empty>Sem dados de facturação.</Empty>)}
        </Card>
      </div>

      <Card title="Alertas inteligentes" actions={<Btn variant="link" onClick={() => nav('/alertas')}>Ver todos</Btn>} className="mt">
        <AlertasPanel alertas={alertas} nav={nav} tratar={(id) => tratarAlerta.mutate(id)} />
      </Card>

      <Card title="Análise e decisão" className="mt">
        <Insights turmas={todasTurmas} kpis={kpisObj} alertas={alertas.rows} />
      </Card>

      <Card
        title="Cobrança por turma — detalhe"
        className="mt"
        pad={false}
        actions={(
          <Select label="Ordenar por" value={ordem} onChange={(v) => setOrdem(v as Ordem)} options={ORDEM_OPCOES} />
        )}
      >
        <Table rows={turmasTabela} cols={colsTurma} rowKey={(r) => r.id || r.nome} pageSize={10}
          loading={painel.isLoading} error={painel.isError ? painel.error : undefined} onRetry={() => painel.refetch()}
          empty="Sem dados de cobrança por turma." />
      </Card>

      {indic.isError && <Card className="mt"><ErrorBox error={indic.error} retry={() => indic.refetch()} /></Card>}
      {indic.rows.length > 0 && (
        <div className="mt">
          <h3 style={{ marginBottom: 8 }}>Indicadores configuráveis</h3>
          <p className="sub" style={{ marginBottom: 10 }}>Indicadores adicionados ao painel pela administração, cada um com o seu próprio formato e destino.</p>
          <div className="grid">
            {indic.rows.map((i, n) => (
              <Kpi
                key={i.id ?? n}
                label={String(pick(i, 'nome', 'titulo', 'codigo') ?? 'Indicador')}
                value={valorIndicador(i)}
                hint={pick(i, 'descricao', 'unidade')}
                onClick={destinoValido(pick(i, 'destino')) ? () => nav(destinoValido(pick(i, 'destino'))!) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {blocks.map(([k, v]) => {
        const rows = asList(v)
        if (Array.isArray(v) && rows.length && rows[0] && typeof rows[0] === 'object') {
          return (
            <div key={k} className="mt">
              <h3 style={{ marginBottom: 8 }}>{humanize(k)}</h3>
              <Table rows={rows} cols={undefined} pageSize={10} />
            </div>
          )
        }
        if (!Array.isArray(v)) {
          const inner = scalarKpis(v as Row)
          if (!inner.length) return null
          return (
            <div key={k} className="mt">
              <h3 style={{ marginBottom: 8 }}>{humanize(k)}</h3>
              <div className="grid">
                {inner.map(([ik, iv]) => <Kpi key={ik} label={humanize(ik)} value={kpiValue(ik, iv)} />)}
              </div>
            </div>
          )
        }
        return null
      })}

      {!painel.isLoading && !painel.isError && Object.keys(kpisObj).length === 0 && blocks.length === 0 && (
        <Card><Empty>O painel ainda não devolveu indicadores.</Empty></Card>
      )}
    </>
  )
}
