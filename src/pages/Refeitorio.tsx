import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Card, Estado, Kpi, Loading, PageHead, SearchBox, Select, Tabs, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { alunoOptions, servicoOptions } from '@/lib/academic'
import { pick, type Row } from '@/lib/data'
import { Kz, dataPT, hojeISO, label } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

type Tab = 'geral' | 'adesoes' | 'tipos' | 'ementas' | 'diario'

const MODALIDADES = [
  { value: 'padrao', label: 'Padrão' }, { value: 'so_utilizacao', label: 'Só utilização' },
  { value: 'alimentacao_completa', label: 'Alimentação completa' }, { value: 'avulso', label: 'Avulso' },
]

function Geral() {
  const nav = useNavigate()
  const q = useGet<any>('/refeitorio')
  const [term, setTerm] = useState('')
  const data = q.data
  const rows = useMemo(() => {
    if (Array.isArray(data)) return data as Row[]
    if (data && typeof data === 'object') {
      const arr = Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object')
      return (arr as Row[]) ?? []
    }
    return []
  }, [data])
  const grupos = useMemo(() => {
    const m: Record<string, number> = {}
    rows.forEach((r) => { const k = String(pick(r, 'modalidade', 'tipo') ?? '—'); m[k] = (m[k] || 0) + 1 })
    return Object.entries(m)
  }, [rows])

  if (q.isLoading) return <Loading />
  const filtradas = term ? rows.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(term.toLowerCase())) : rows
  return (
    <>
      {grupos.length > 0 && (
        <div className="grid" style={{ marginBottom: 12 }}>
          {grupos.map(([k, n]) => <Kpi key={k} label={label(k)} value={`${n} alunos`} />)}
        </div>
      )}
      {rows.length ? (
        <>
          <Toolbar><SearchBox value={term} onChange={setTerm} placeholder="Procurar aluno" /></Toolbar>
          <Table
            rows={filtradas}
            onRow={(r) => { const a = pick(r, 'aluno_id', 'aluno.id'); if (a) nav(`/alunos/${a}`) }}
            cols={[
              { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo', 'nome_completo'] },
              { h: 'Turma', k: ['turma', 'turma_designacao', 'turma.designacao'] },
              { h: 'Modalidade', render: (r) => label(pick(r, 'modalidade')) },
              { h: 'Mensalidade', right: true, render: (r) => { const v = pick(r, 'mensalidade', 'valor', 'preco'); return v === undefined ? '—' : Kz(v) } },
              { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado_pagamento', 'estado', 'situacao')} /> },
            ]}
          />
        </>
      ) : (
        <AutoSections data={data} />
      )}
      <p className="note">Separa quem paga a alimentação de quem paga só a utilização do refeitório. Extensões previstas: transporte, actividades extra e fardamento, com a mesma estrutura de serviço.</p>
    </>
  )
}

function Ementas() {
  const [desde, setDesde] = useState(hojeISO())
  const [ate, setAte] = useState('')
  const [novo, setNovo] = useState(false)
  const q = useList('/refeitorio/ementas', { desde, ate })
  const def = useAct((p: Row) => api.put('/refeitorio/ementas', p), { invalidate: ['/refeitorio/ementas'], ok: 'Ementa guardada.' })
  return (
    <>
      <Toolbar>
        <label className="mu">De <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="mu">Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <span className="grow" />
        <Btn onClick={() => setNovo(true)}>Definir ementa</Btn>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} empty="Sem ementas neste intervalo." cols={[
        { h: 'Data', render: (r) => dataPT(pick(r, 'data')) },
        { h: 'Refeição', k: ['refeicao_tipo', 'tipo', 'refeicao_tipo.designacao', 'designacao'] },
        { h: 'Ementa', k: 'descricao', nowrap: false },
      ]} />
      {novo && (
        <FormDialog title="Definir ementa" size="md" onClose={() => setNovo(false)} onSubmit={(p) => def.mutateAsync(p)} fields={[
          { name: 'data', label: 'Data', type: 'date', required: true, default: hojeISO() },
          { name: 'refeicao_tipo_id', label: 'Refeição', type: 'select', required: true, options: { path: '/refeitorio/tipos', label: ['designacao'] } },
          { name: 'descricao', label: 'Ementa', type: 'textarea', required: true },
        ]} />
      )}
    </>
  )
}

function Diario() {
  const [data, setData] = useState(hojeISO())
  const [turma, setTurma] = useState('')
  const [tipo, setTipo] = useState('')
  const [sel, setSel] = useState<(string | number)[]>([])
  const tipos = useList('/refeitorio/tipos')
  const turmas = useList('/turmas')
  const alunos = useList('/alunos', { turma_id: turma, estado: 'activo', limit: 500 })
  const registos = useList('/refeitorio/registos', { data })
  const regista = useAct((p: Row) => api.post('/refeitorio/registos', p), { invalidate: ['/refeitorio/registos'], ok: 'Controlo guardado.', onDone: () => setSel([]) })

  return (
    <div className="two">
      <Card title="Registar quem comeu">
        <div className="toolbar">
          <input type="date" aria-label="Data" value={data} onChange={(e) => setData(e.target.value)} />
          <Select label="Refeição" value={tipo} onChange={setTipo} placeholder="Refeição" options={tipos.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
          <Select label="Turma" value={turma} onChange={(v) => { setTurma(v); setSel([]) }} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        </div>
        <Table rows={turma ? alunos.rows : []} loading={alunos.isLoading} pageSize={0} selected={sel} onSelect={setSel} empty="Escolha uma turma para listar os alunos."
          cols={[{ h: 'Aluno', k: ['nome_completo', 'nome'] }]} />
        <div className="form-f">
          <Btn disabled={!tipo || !sel.length} busy={regista.isPending} onClick={() => regista.mutate({ refeicao_tipo_id: Number(tipo), data, aluno_ids: sel.map(Number) })}>
            Registar {sel.length || ''} aluno(s)
          </Btn>
        </div>
      </Card>
      <Card title={`Registos de ${dataPT(data)}`} pad={false}>
        <Table rows={registos.rows} loading={registos.isLoading} empty="Sem registos neste dia." cols={[
          { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
          { h: 'Refeição', k: ['refeicao_tipo', 'tipo', 'refeicao_tipo.designacao'] },
          { h: 'Valor avulso', render: (r) => { const v = pick(r, 'valor_avulso'); return v === undefined ? '—' : Kz(v) } },
        ]} />
      </Card>
    </div>
  )
}

const adesaoFields: FieldDef[] = [
  { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
  { name: 'servico_id', label: 'Serviço', type: 'select', options: servicoOptions, required: true },
  { name: 'modalidade', label: 'Modalidade', type: 'select', options: MODALIDADES, default: 'padrao', required: true },
  { name: 'data_inicio', label: 'Início', type: 'date' },
]

export default function Refeitorio() {
  const [tab, setTab] = useState<Tab>('geral')
  return (
    <>
      <PageHead title="Refeitório e serviços" sub="Quem paga alimentação, quem paga só a utilização, ementas e controlo diário." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['geral', 'Visão geral'], ['adesoes', 'Adesões'], ['tipos', 'Tipos de refeição'], ['ementas', 'Ementas'], ['diario', 'Controlo diário']]} />
      {tab === 'geral' && <Geral />}
      {tab === 'adesoes' && (
        <Resource
          path="/refeitorio/adesoes" search createLabel="Nova adesão" createFields={adesaoFields}
          editFields={[
            { name: 'modalidade', label: 'Modalidade', type: 'select', options: MODALIDADES },
            { name: 'estado', label: 'Estado', type: 'select', options: [{ value: 'activa', label: 'Activa' }, { value: 'suspensa', label: 'Suspensa' }, { value: 'cancelada', label: 'Cancelada' }] },
            { name: 'data_fim', label: 'Data de fim', type: 'date' },
          ]}
          editPath={(r) => `/refeitorio/adesoes/${r.id}`}
          cols={[
            { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
            { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] },
            { h: 'Modalidade', render: (r) => label(pick(r, 'modalidade')) },
            { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) },
            { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
          ]}
        />
      )}
      {tab === 'tipos' && (
        <Resource path="/refeitorio/tipos" crud="/refeitorio/tipos" createLabel="Novo tipo" createFields={[{ name: 'designacao', label: 'Designação', required: true, placeholder: 'Almoço' }, { name: 'hora_inicio', label: 'Hora de início', type: 'time' }]}
          cols={[{ h: 'Refeição', k: ['designacao', 'nome'] }, { h: 'Hora', k: 'hora_inicio' }]} />
      )}
      {tab === 'ementas' && <Ementas />}
      {tab === 'diario' && <Diario />}
    </>
  )
}

