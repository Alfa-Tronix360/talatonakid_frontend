import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { FormDialog } from '@/components/FormDialog'
import { Table, autoCols } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Card, Empty, ErrorBox, Estado, Loading, PageHead, Select, Tabs } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { asList, nameOf, num, pick, type Row } from '@/lib/data'
import { dataPT, fmtNota } from '@/lib/format'
import { useAct, useGet } from '@/lib/hooks'

type Tab = 'geral' | 'pauta' | 'notas' | 'mac' | 'provas' | 'professores' | 'transporte'
const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

/** Pauta do educando: média de cada disciplina nos trimestres, média final e situação. */
function Pauta({ id }: { id: string }) {
  const q = useGet<Row>(`/portal/educandos/${id}/pauta`)
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const d = q.data || {}
  const minima = num(d.nota_minima)
  const nota = (v: unknown) => (v == null ? <span className="mu">—</span>
    : <span style={{ color: num(v) < minima ? 'var(--er)' : undefined, fontWeight: num(v) < minima ? 700 : 400 }}>{fmtNota(v)}</span>)
  const periodos = asList<string>(d.periodos)
  return (
    <Card title={`Pauta ${d.turma ? `— turma ${d.turma}` : ''}`} pad={false}>
      <Table rows={asList(d.linhas)} pageSize={0} empty="Sem disciplinas ou notas neste ano."
        rowKey={(r) => r.disciplina_id}
        cols={[
          { h: 'Disciplina', k: 'disciplina' },
          ...periodos.map((p, i) => ({ h: p, right: true, render: (r: Row) => nota(r.medias?.[i]) })),
          { h: 'Média final', right: true, render: (r) => <b>{nota(r.media_final)}</b> },
          { h: 'Situação', render: (r) => (r.situacao ? <Estado v={r.situacao === 'positiva' ? 'pago' : 'divida'} text={r.situacao === 'positiva' ? 'Positiva' : 'Negativa'} /> : '—') },
        ]}
        foot={periodos.length ? `Média geral: ${asList(d.medias_gerais).map((m, i) => `${periodos[i]} ${fmtNota(m)}`).join(' · ')} · Escala 0 a ${fmtNota(d.nota_maxima)}` : undefined}
      />
    </Card>
  )
}

/** MAC (avaliações contínuas), provas e média de cada disciplina por trimestre. */
function Mac({ id }: { id: string }) {
  const q = useGet<Row>(`/portal/educandos/${id}/mac`)
  if (q.isLoading) return <Loading />
  const d = q.data || {}
  const periodos = asList<string>(d.periodos)
  return (
    <Card title="MAC — média das avaliações contínuas" pad={false}>
      <Table rows={asList(d.linhas)} pageSize={0} rowKey={(r) => r.disciplina_id} empty="Sem notas lançadas."
        cols={[
          { h: 'Disciplina', k: 'disciplina' },
          ...periodos.flatMap((p, i) => [
            { h: `${p.split(' ')[0]}T · MAC`, right: true, render: (r: Row) => fmtNota(r.trimestres?.[i]?.mac) },
            { h: `${p.split(' ')[0]}T · Provas`, right: true, render: (r: Row) => fmtNota(r.trimestres?.[i]?.provas) },
            { h: `${p.split(' ')[0]}T · Média`, right: true, render: (r: Row) => <b>{fmtNota(r.trimestres?.[i]?.media)}</b> },
          ]),
        ]} />
    </Card>
  )
}

function Provas({ id }: { id: string }) {
  const q = useGet<Row[]>(`/portal/educandos/${id}/calendario`)
  const lista = asList(q.data)
  return (
    <Card title="Calendário das provas" pad={false}>
      <Table rows={lista} loading={q.isLoading} error={q.error} pageSize={0} rowKey={(r) => r.avaliacao_id}
        empty="Não há provas marcadas a partir de hoje."
        cols={[
          { h: 'Data', render: (r) => dataPT(r.data) },
          { h: 'Disciplina', k: 'disciplina' },
          { h: 'Avaliação', render: (r) => r.descricao || r.tipo },
          { h: 'Tipo', k: 'tipo' },
          { h: 'Trimestre', k: 'periodo' },
        ]} />
    </Card>
  )
}

function Professores({ id }: { id: string }) {
  const q = useGet<Row[]>(`/portal/educandos/${id}/professores`)
  const [avaliar, setAvaliar] = useState<Row | null>(null)
  const enviar = useAct((p: Row) => api.post('/portal/avaliacoes-professores', p), {
    invalidate: [`/portal/educandos/${id}/professores`], ok: 'Obrigado! A sua avaliação foi registada.',
  })
  const lista = asList(q.data)
  return (
    <Card title={`Avaliar os professores${lista[0]?.periodo ? ` — ${lista[0].periodo}` : ''}`} pad={false}>
      <p className="note" style={{ margin: '12px 16px' }}>A sua opinião ajuda a escola a melhorar. A direcção vê as notas e os comentários sem o seu nome.</p>
      <Table rows={lista} loading={q.isLoading} error={q.error} pageSize={0} rowKey={(r) => r.funcionario_id}
        empty="A turma ainda não tem professores atribuídos."
        cols={[
          { h: 'Professor', k: 'nome' },
          { h: 'Disciplinas', render: (r) => asList<string>(r.disciplinas).join(', '), nowrap: false },
          { h: 'A minha avaliação', render: (r) => (r.minha_nota ? <span style={{ color: 'var(--wa)' }}>{estrelas(r.minha_nota)}</span> : <span className="mu">Ainda não avaliou</span>) },
          { h: '', render: (r) => <Btn size="sm" variant="ghost" onClick={() => setAvaliar(r)}>{r.minha_nota ? 'Alterar' : 'Avaliar'}</Btn> },
        ]} />
      {avaliar && (
        <FormDialog
          title={`Avaliar ${avaliar.nome}`} size="sm" submitLabel="Enviar avaliação"
          initial={{ nota: avaliar.minha_nota ?? 5, comentario: avaliar.meu_comentario ?? '' }}
          fields={[
            { name: 'nota', label: 'Avaliação', type: 'select', required: true, wide: true,
              options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${estrelas(n)}  ${['', 'Muito insatisfeito', 'Insatisfeito', 'Razoável', 'Satisfeito', 'Muito satisfeito'][n]}` })) },
            { name: 'comentario', label: 'Comentário (opcional)', type: 'textarea', wide: true },
          ]}
          onClose={() => setAvaliar(null)}
          onSubmit={(p) => enviar.mutateAsync({ ...p, funcionario_id: avaliar.funcionario_id, aluno_id: Number(id) })}
        />
      )}
    </Card>
  )
}

function Transporte({ id }: { id: string }) {
  const q = useGet<Row | null>(`/portal/educandos/${id}/transporte`)
  if (q.isLoading) return <Loading />
  const t = q.data
  if (!t) return <Card><Empty>O seu educando não está inscrito no transporte escolar. Para inscrever, contacte a secretaria.</Empty></Card>
  const h = (v: unknown) => (v ? String(v).slice(0, 5) : '—')
  return (
    <Card title={`Transporte — ${t.rota}`}>
      <dl className="kv">
        {([
          ['Paragem', t.paragem ?? '—'], ['Hora na paragem (ida)', h(t.hora_ida)], ['Hora de regresso', h(t.hora_volta)],
          ['Sentido', { ida_volta: 'Ida e volta', ida: 'Só ida', volta: 'Só volta' }[String(t.sentido)] ?? t.sentido],
          ['Viatura', t.viatura ?? '—'], ['Motorista', t.motorista ?? '—'], ['Telefone do motorista', t.telefone_motorista ?? '—'],
          ['Estado', t.estado === 'suspensa' ? 'Suspensa' : 'Activa'],
        ] as [string, unknown][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}
      </dl>
    </Card>
  )
}

export default function Educando() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('geral')
  const [periodo, setPeriodo] = useState('')
  const periodos = asList(useGet<Row[]>('/portal/periodos').data)
  const q = useGet<Row>(`/portal/educandos/${id}`)
  const notas = useGet<any>(tab === 'notas' ? `/portal/educandos/${id}/notas` : null)

  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const nome = String(pick(q.data, 'nome_completo', 'nome', 'aluno.nome', 'aluno.nome_completo') ?? 'Educando')
  const lista = asList(notas.data)
  const pdf = (path: string, params?: Record<string, string>) => api.download(path, params, undefined, true).catch((e) => toast.error(errMsg(e)))

  return (
    <>
      <PageHead title={nome} sub={<Link to="/portal">← Resumo</Link>}
        actions={<Btn variant="ghost" onClick={() => pdf(`/portal/educandos/${id}/extracto.pdf`)}>Extracto (PDF)</Btn>} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        ['geral', 'Situação'], ['pauta', 'Pauta'], ['notas', 'Notas e boletim'], ['mac', 'MAC'],
        ['provas', 'Provas marcadas'], ['professores', 'Professores'], ['transporte', 'Transporte'],
      ]} />
      {tab === 'geral' && <AutoSections data={q.data} skip={['id', 'aluno_id']} />}
      {tab === 'pauta' && <Pauta id={id} />}
      {tab === 'mac' && <Mac id={id} />}
      {tab === 'provas' && <Provas id={id} />}
      {tab === 'professores' && <Professores id={id} />}
      {tab === 'transporte' && <Transporte id={id} />}
      {tab === 'notas' && (
        <div className="stack">
          <Card title="Boletim de avaliação">
            <div className="toolbar" style={{ margin: 0 }}>
              {periodos.length ? (
                <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Escolha o período" options={periodos.map((p) => ({ value: p.id, label: nameOf(p) }))} />
              ) : (
                <input type="number" min={1} placeholder="N.º do período" aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              )}
              <Btn disabled={!periodo} onClick={() => pdf(`/portal/educandos/${id}/boletim.pdf`, { periodo_id: periodo })}>Abrir boletim (PDF)</Btn>
            </div>
          </Card>
          <Card title="Notas lançadas" pad={false}>
            {notas.isLoading ? <Loading /> : <Table rows={lista} cols={autoCols(lista)} error={notas.error} empty="Ainda não há notas lançadas." />}
          </Card>
        </div>
      )}
    </>
  )
}
