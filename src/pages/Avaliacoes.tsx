import { useEffect, useState } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Loading, PageHead, Select, Tabs, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { disciplinaOptions, useAnoActivo } from '@/lib/academic'
import { num, pick, type Row } from '@/lib/data'
import { dataPT, hojeISO } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

function Notas({ av, turmaId, onClose }: { av: Row; turmaId: string; onClose: () => void }) {
  const notas = useList(`/avaliacoes/${av.id}/notas`)
  const alunos = useList('/alunos', { turma_id: turmaId, estado: 'activo', limit: 500 })
  const [vals, setVals] = useState<Record<string, { valor: string; observacao: string }>>({})

  useEffect(() => {
    const m: Record<string, { valor: string; observacao: string }> = {}
    notas.rows.forEach((n) => {
      const id = pick(n, 'aluno_id', 'aluno.id')
      if (id !== undefined) m[id] = { valor: pick(n, 'valor', 'nota') !== undefined ? String(pick(n, 'valor', 'nota')) : '', observacao: String(pick(n, 'observacao') ?? '') }
    })
    setVals(m)
  }, [notas.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const lista: Row[] = alunos.rows.length ? alunos.rows : notas.rows.map((n) => ({ id: pick(n, 'aluno_id', 'aluno.id'), nome_completo: pick(n, 'aluno', 'aluno_nome', 'aluno.nome_completo') }))
  const guardar = useAct((payload: Row) => api.put(`/avaliacoes/${av.id}/notas`, payload), { invalidate: [`/avaliacoes`, '/pautas'], ok: 'Notas guardadas.', onDone: onClose })
  const set = (id: number, k: 'valor' | 'observacao', v: string) => setVals((s) => ({ ...s, [id]: { valor: s[id]?.valor ?? '', observacao: s[id]?.observacao ?? '', [k]: v } }))

  return (
    <Modal title={`Lançar notas — ${pick(av, 'descricao', 'tipo', 'tipo.designacao') ?? 'avaliação'} (${dataPT(pick(av, 'data'))})`} size="lg" onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn busy={guardar.isPending} onClick={() => guardar.mutate({
          notas: lista.filter((a) => vals[a.id]?.valor !== undefined && vals[a.id].valor !== '' || vals[a.id]?.observacao).map((a) => ({ aluno_id: a.id, valor: vals[a.id]?.valor === '' ? null : String(num(vals[a.id]?.valor)), observacao: vals[a.id]?.observacao || null })),
        })}>Guardar notas</Btn></>}>
      {notas.isLoading || alunos.isLoading ? <Loading /> : (
        <Table rows={lista} pageSize={0} empty="Esta turma não tem alunos." cols={[
          { h: 'Aluno', k: ['nome_completo', 'nome'] },
          { h: 'Nota (0–20)', render: (a) => <input type="number" min={0} max={20} step="0.1" style={{ width: 90 }} aria-label={`Nota de ${a.nome_completo}`} value={vals[a.id]?.valor ?? ''} onChange={(e) => set(a.id, 'valor', e.target.value)} /> },
          { h: 'Observação', render: (a) => <input style={{ width: '100%', minWidth: 160 }} aria-label="Observação" value={vals[a.id]?.observacao ?? ''} onChange={(e) => set(a.id, 'observacao', e.target.value)} /> },
        ]} />
      )}
    </Modal>
  )
}

export default function Avaliacoes() {
  const { ano, periodos } = useAnoActivo()
  const [tab, setTab] = useState<'lista' | 'tipos'>('lista')
  const [turma, setTurma] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [disc, setDisc] = useState('')
  const [novo, setNovo] = useState(false)
  const [lancar, setLancar] = useState<Row | null>(null)
  const turmas = useList('/turmas')
  const disciplinas = useList('/disciplinas')
  const q = useList(turma ? '/avaliacoes' : null, { turma_id: turma, periodo_id: periodo, disciplina_id: disc })
  const criar = useAct((p: Row) => api.post('/avaliacoes', p), { invalidate: ['/avaliacoes'], ok: 'Avaliação criada.' })

  return (
    <>
      <PageHead title="Avaliações e notas" sub={`Crie avaliações por turma, disciplina e período${ano ? ` (${pick(ano, 'designacao')})` : ''} e lance as notas.`}
        actions={tab === 'lista' && <Btn disabled={!turma} onClick={() => setNovo(true)}>Nova avaliação</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[['lista', 'Avaliações'], ['tipos', 'Tipos de avaliação']]} />
      {tab === 'lista' && (
        <>
          <Toolbar>
            <Select label="Turma" value={turma} onChange={setTurma} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
            <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Todos os períodos" options={periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao')) }))} />
            <Select label="Disciplina" value={disc} onChange={setDisc} placeholder="Todas as disciplinas" options={disciplinas.rows.map((d) => ({ value: d.id, label: String(pick(d, 'nome')) }))} />
          </Toolbar>
          <Table
            rows={q.rows}
            loading={q.isLoading}
            error={q.error}
            onRow={setLancar}
            empty={turma ? 'Sem avaliações para estes filtros.' : 'Escolha uma turma para ver as avaliações.'}
            cols={[
              { h: 'Data', render: (r) => dataPT(pick(r, 'data')) },
              { h: 'Disciplina', k: ['disciplina', 'disciplina_nome', 'disciplina.nome'] },
              { h: 'Tipo', k: ['tipo', 'tipo_designacao', 'tipo.designacao'] },
              { h: 'Período', k: ['periodo', 'periodo_designacao', 'periodo.designacao'] },
              { h: 'Descrição', k: 'descricao' },
              { h: '', render: () => <span className="mu">Lançar notas →</span> },
            ]}
          />
          {novo && (
            <FormDialog title="Nova avaliação" onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync({ ...p, turma_id: Number(turma) })}
              fields={[
                { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true },
                { name: 'periodo_id', label: 'Período', type: 'select', required: true, default: periodo ? Number(periodo) : undefined, options: periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao')) })) },
                { name: 'tipo_id', label: 'Tipo', type: 'select', required: true, options: { path: '/tipos-avaliacao', label: ['designacao'] } },
                { name: 'data', label: 'Data', type: 'date', required: true, default: hojeISO() },
                { name: 'descricao', label: 'Descrição', wide: true },
              ]} />
          )}
          {lancar && <Notas av={lancar} turmaId={turma} onClose={() => setLancar(null)} />}
        </>
      )}
      {tab === 'tipos' && (
        <Resource path="/tipos-avaliacao" createLabel="Novo tipo"
          createFields={[{ name: 'designacao', label: 'Designação', required: true, placeholder: 'Prova mensal' }, { name: 'peso', label: 'Peso', type: 'number', default: 1, asString: true }]}
          cols={[{ h: 'Tipo', k: 'designacao' }, { h: 'Peso', k: 'peso' }]} />
      )}
    </>
  )
}
