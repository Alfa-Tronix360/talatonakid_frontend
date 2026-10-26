import { useNavigate } from 'react-router'
import { Table, type Col } from '@/components/Table'
import { Btn, Card, Empty, ErrorBox, Kpi, Loading, PageHead } from '@/components/ui'
import { TIPOS_ALERTA } from '@/pages/Alertas'
import { api } from '@/lib/api'
import { num, pick, type Row } from '@/lib/data'
import { Kz, dataPT, fmtNota, pct } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

// Indicadores que a área Finanças já mostra (os quatro que o sistema cria por omissão).
const JA_NO_PAINEL = ['recebido_mes', 'em_atraso', 'alunos_incumprimento', 'taxa_cobranca']

type Linha = { rotulo: string; valor: string; nota?: string; tom?: 'good' | 'bad' | 'warn'; to?: string }

/** Uma área da escola (alunos, aproveitamento…): três ou quatro números, cada um leva ao ecrã onde se trata. */
function Area({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const nav = useNavigate()
  return (
    <Card title={titulo}>
      <ul className="pd-linhas">
        {linhas.map((l) => (
          <li key={l.rotulo}>
            <button type="button" disabled={!l.to} onClick={() => l.to && nav(l.to)}>
              <span>{l.rotulo}{l.nota && <small>{l.nota}</small>}</span>
              <b className={l.tom ? `pd-${l.tom}` : ''}>{l.valor}</b>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Painel da Direcção: a escola de relance — alunos, aproveitamento, assiduidade e disciplina, e finanças. */
export default function Painel() {
  const nav = useNavigate()
  const painel = useGet<Row>('/painel')
  const indic = useList('/indicadores')
  const outros = indic.rows.filter((i) => !JA_NO_PAINEL.includes(String(i.codigo)))
  const alertas = useList('/alertas', { estado: 'novo' })
  const gerar = useAct(() => api.post('/alertas/gerar'), { invalidate: ['/alertas', '/painel'], ok: 'Alertas recalculados.' })

  const d = painel.data ?? {}
  const e: Row = d.escola ?? {}
  const k: Row = d.kpis ?? {}
  const turmas: Row[] = d.turmas ?? []
  const max = num(e.nota_maxima) || 10
  const ocupacao = num(e.lugares) ? (num(e.alunos) / num(e.lugares)) * 100 : null

  const cols: Col[] = [
    { h: 'Turma', k: 'turma' },
    { h: 'Alunos', render: (t) => `${t.alunos}/${t.capacidade}`, right: true },
    { h: 'Média', render: (t) => (t.media == null ? '—' : <b className={t.media < num(e.nota_minima) ? 'pd-bad' : ''}>{fmtNota(t.media)}</b>), right: true },
    { h: 'Negativas', render: (t) => (t.negativas ? <span className="pd-bad">{t.negativas}</span> : '0'), right: true },
    { h: `Faltas (${e.dias_faltas ?? 30} dias)`, k: 'faltas', right: true },
    { h: 'Ocorrências', render: (t) => (t.ocorrencias_abertas ? <span className="pd-warn">{t.ocorrencias_abertas}</span> : '0'), right: true },
    { h: 'Cobrança', render: (t) => (t.taxa_cobranca == null ? '—' : pct(t.taxa_cobranca)), right: true },
  ]

  return (
    <>
      <PageHead
        title="Painel da Direcção"
        sub="A escola de relance: alunos, aproveitamento, assiduidade e disciplina, e finanças."
        actions={(
          <>
            <Btn variant="ghost" busy={painel.isFetching} onClick={() => { painel.refetch(); alertas.refetch(); indic.refetch() }}>Actualizar</Btn>
            <Btn variant="ghost" busy={gerar.isPending} onClick={() => gerar.mutate()}>Recalcular alertas</Btn>
          </>
        )}
      />
      {painel.isLoading && <Loading />}
      {painel.isError && <Card><ErrorBox error={painel.error} retry={() => painel.refetch()} /></Card>}
      {painel.data && (
        <>
          <p className="sub painel-meta">
            Situação em {dataPT(d.data)}{d.ano_lectivo ? <> · Ano lectivo <b>{d.ano_lectivo}</b></> : ' · Sem ano lectivo activo'}
          </p>

          <div className="pd-areas">
            <Area titulo="Alunos" linhas={[
              { rotulo: 'Matriculados', valor: String(e.alunos ?? 0), nota: ocupacao == null ? undefined : `${pct(ocupacao)} dos ${e.lugares} lugares`, to: '/alunos' },
              { rotulo: 'Turmas', valor: String(e.turmas ?? 0), to: '/turmas' },
              { rotulo: 'Necessidades especiais', valor: String(e.alunos_nee ?? 0), tom: e.alunos_nee ? 'warn' : undefined, to: '/alunos' },
              { rotulo: 'Pedidos por decidir', valor: String(e.pedidos_pendentes ?? 0), nota: 'dos encarregados', tom: e.pedidos_pendentes ? 'warn' : undefined, to: '/pedidos?estado=pendente' },
            ]} />
            <Area titulo="Aproveitamento" linhas={[
              { rotulo: 'Média geral', valor: e.media_geral == null ? '—' : `${fmtNota(e.media_geral)} / ${max}`, nota: e.media_geral == null ? 'ainda sem notas' : undefined,
                tom: e.media_geral != null && e.media_geral < num(e.nota_minima) ? 'bad' : undefined, to: '/pautas' },
              { rotulo: 'Alunos com negativa', valor: String(e.alunos_com_negativa ?? 0), nota: `média abaixo de ${fmtNota(e.nota_minima)}`, tom: e.alunos_com_negativa ? 'bad' : 'good', to: '/pautas' },
              { rotulo: 'Avaliação dos professores', valor: e.avaliacao_professores == null ? '—' : `${String(e.avaliacao_professores).replace('.', ',')} / 5`, nota: 'pelos encarregados', to: '/avaliacao-professores' },
            ]} />
            <Area titulo="Assiduidade e disciplina" linhas={[
              { rotulo: 'Faltas injustificadas', valor: String(e.faltas_injustificadas ?? 0), nota: `últimos ${e.dias_faltas ?? 30} dias`, tom: e.faltas_injustificadas ? 'warn' : undefined, to: '/assiduidade' },
              { rotulo: 'Ocorrências por fechar', valor: String(e.ocorrencias_abertas ?? 0), tom: e.ocorrencias_abertas ? 'warn' : undefined, to: '/ocorrencias' },
              { rotulo: 'Das quais graves', valor: String(e.ocorrencias_graves ?? 0), tom: e.ocorrencias_graves ? 'bad' : undefined, to: '/ocorrencias' },
            ]} />
            <Area titulo="Finanças" linhas={[
              { rotulo: 'Taxa de cobrança', valor: k.facturado ? pct(num(k.taxa_cobranca)) : '—', nota: 'do que já venceu', to: '/cobrancas' },
              { rotulo: 'Recebido este mês', valor: Kz(k.recebido_mes ?? 0), tom: 'good', to: '/pagamentos' },
              { rotulo: 'Em atraso', valor: Kz(k.em_atraso ?? 0), nota: k.alunos_em_incumprimento ? `${k.alunos_em_incumprimento} aluno(s)` : undefined, tom: k.em_atraso ? 'bad' : undefined, to: '/cobrancas?estado=divida' },
            ]} />
          </div>

          <Card title="Por turma" className="mt" pad={false}>
            <Table rows={turmas} cols={cols} rowKey={(t) => t.turma_id} empty="Ainda não há turmas no ano lectivo activo." />
          </Card>
        </>
      )}

      <Card title="Alertas por tratar" className="mt" actions={<Btn variant="link" onClick={() => nav('/alertas?estado=novo')}>Ver todos</Btn>}>
        {alertas.isLoading ? <Loading /> : alertas.isError ? <ErrorBox error={alertas.error} retry={() => alertas.refetch()} />
          : !alertas.rows.length ? <Empty>Sem alertas por tratar. Tudo em ordem.</Empty> : (
            // Um número por tipo (incumprimento, desempenho, faltas, comportamento…): a lista de cada um fica em Alertas.
            <ul className="pd-linhas pd-tipos">
              {TIPOS_ALERTA.map((t) => [t, alertas.rows.filter((a) => a.tipo === t.value)] as const).filter(([, l]) => l.length).map(([t, l]) => (
                <li key={t.value}>
                  <button type="button" onClick={() => nav(`/alertas?tipo=${t.value}&estado=novo`)}>
                    <span>{t.label}<small>{l.slice(0, 2).map((a) => a.aluno ?? pick(a, 'mensagem')).filter(Boolean).join(', ')}{l.length > 2 ? '…' : ''}</small></span>
                    <b className={l.some((a) => a.gravidade === 'alta') ? 'pd-bad' : 'pd-warn'}>{l.length}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>

      {outros.length > 0 && (
        <div className="mt">
          <h3 style={{ marginBottom: 8 }}>Outros indicadores</h3>
          <div className="grid">
            {outros.map((i) => {
              const v = pick(i, 'valor')
              const f = pick(i, 'formato')
              return <Kpi key={i.id} label={String(pick(i, 'nome', 'codigo'))} value={v == null ? '—' : f === 'kz' ? Kz(v) : f === 'pct' ? pct(num(v)) : num(v).toLocaleString('pt-PT')} />
            })}
          </div>
        </div>
      )}
    </>
  )
}
