import { useEffect, useState } from 'react'
import { Table } from '@/components/Table'
import { Btn, Estado, Loading, PageHead, Select, Tabs, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { disciplinaOptions } from '@/lib/academic'
import { pick, type Row } from '@/lib/data'
import { dataPT, hojeISO, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { useOptions } from '@/components/FormDialog'

const ESTADOS = ['presente', 'falta_justificada', 'falta_injustificada', 'atraso'].map((v) => ({ value: v, label: v === 'atraso' ? 'Atraso' : label(v) }))

function Chamada() {
  const [turma, setTurma] = useState('')
  const [data, setData] = useState(hojeISO())
  const [disc, setDisc] = useState('')
  const [reg, setReg] = useState<Record<string, { estado: string; justificacao: string }>>({})
  const turmas = useList('/turmas')
  const { opts: discs } = useOptions(disciplinaOptions)
  const alunos = useList(turma ? '/alunos' : null, { turma_id: turma, estado: 'activo', limit: 500 })
  const existentes = useList(turma ? '/assiduidade' : null, { turma_id: turma, desde: data, ate: data })
  const gravar = useAct((p: Row) => api.post('/assiduidade', p), { invalidate: ['/assiduidade', '/alertas'], ok: 'Chamada guardada.' })

  useEffect(() => {
    const m: typeof reg = {}
    alunos.rows.forEach((a) => { m[a.id] = { estado: 'presente', justificacao: '' } })
    existentes.rows.forEach((e) => {
      const id = pick(e, 'aluno_id', 'aluno.id')
      if (id !== undefined && m[id]) m[id] = { estado: String(pick(e, 'estado') ?? 'presente'), justificacao: String(pick(e, 'justificacao') ?? '') }
    })
    setReg(m)
  }, [alunos.data, existentes.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const marcarTodos = (estado: string) => setReg((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, estado }])))
  const faltas = Object.values(reg).filter((r) => r.estado !== 'presente').length

  return (
    <>
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <input type="date" aria-label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        <Select label="Disciplina" value={disc} onChange={setDisc} placeholder="Dia inteiro" options={discs} />
        <span className="grow" />
        <Btn variant="ghost" disabled={!turma} onClick={() => marcarTodos('presente')}>Todos presentes</Btn>
        <Btn variant="ghost" disabled={!turma} onClick={() => marcarTodos('falta_injustificada')}>Todos ausentes</Btn>
        <Btn disabled={!turma || !alunos.rows.length} busy={gravar.isPending} onClick={() => gravar.mutate({
          turma_id: Number(turma), data, disciplina_id: disc ? Number(disc) : undefined,
          registos: alunos.rows.map((a) => ({ aluno_id: a.id, estado: reg[a.id]?.estado ?? 'presente', justificacao: reg[a.id]?.justificacao || undefined })),
        })}>Guardar chamada{faltas ? ` (${faltas} ausência${faltas > 1 ? 's' : ''})` : ''}</Btn>
      </Toolbar>
      {!turma ? <Table rows={[]} empty="Escolha a turma para fazer a chamada." /> : alunos.isLoading ? <Loading /> : (
        <Table rows={alunos.rows} pageSize={0} empty="Esta turma não tem alunos activos." cols={[
          { h: 'Aluno', k: ['nome_completo', 'nome'] },
          { h: 'Presença', render: (a) => (
            <select aria-label={`Presença de ${a.nome_completo}`} value={reg[a.id]?.estado ?? 'presente'} onChange={(e) => setReg((r) => ({ ...r, [a.id]: { ...(r[a.id] ?? { justificacao: '' }), estado: e.target.value } }))}>
              {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) },
          { h: 'Justificação', render: (a) => (reg[a.id]?.estado ?? 'presente') === 'presente' ? <span className="mu">—</span> : (
            <input style={{ width: '100%', minWidth: 180 }} aria-label="Justificação" value={reg[a.id]?.justificacao ?? ''} onChange={(e) => setReg((r) => ({ ...r, [a.id]: { ...r[a.id], justificacao: e.target.value } }))} />
          ) },
        ]} />
      )}
    </>
  )
}

function Consulta() {
  const [turma, setTurma] = useState('')
  const [desde, setDesde] = useState('')
  const [ate, setAte] = useState('')
  const turmas = useList('/turmas')
  const q = useList('/assiduidade', { turma_id: turma, desde, ate })
  return (
    <>
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Todas as turmas" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <label className="mu">De <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="mu">Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} cols={[
        { h: 'Data', render: (r) => dataPT(pick(r, 'data')) },
        { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
        { h: 'Turma', k: ['turma', 'turma_designacao', 'turma.designacao'] },
        { h: 'Disciplina', k: ['disciplina', 'disciplina.nome'] },
        { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} text={pick(r, 'estado') === 'atraso' ? 'Atraso' : undefined} /> },
        { h: 'Justificação', k: 'justificacao', nowrap: false },
      ]} />
    </>
  )
}

export default function Assiduidade() {
  const [tab, setTab] = useState<'chamada' | 'consulta'>('chamada')
  return (
    <>
      <PageHead title="Assiduidade" sub="Chamada diária por turma e consulta do histórico de faltas." />
      <Tabs value={tab} onChange={setTab} tabs={[['chamada', 'Fazer chamada'], ['consulta', 'Histórico']]} />
      {tab === 'chamada' ? <Chamada /> : <Consulta />}
    </>
  )
}
