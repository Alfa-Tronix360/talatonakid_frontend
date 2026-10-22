import { useState } from 'react'
import { FormFields, initialValues, toPayload, type FieldDef } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Loading, PageHead, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { num, pick, type Row } from '@/lib/data'
import { PERIODOS_DIA, classeOptions, disciplinaOptions, funcionarioOptions, salaOptions } from '@/lib/academic'
import { label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

const comuns: FieldDef[] = [
  { name: 'designacao', label: 'Designação', required: true, placeholder: 'Ex.: 7.ª A' },
  { name: 'sala_id', label: 'Sala', type: 'select', options: salaOptions },
  { name: 'periodo_dia', label: 'Período do dia', type: 'select', options: PERIODOS_DIA, default: 'manha', required: true },
  { name: 'director_turma_id', label: 'Director de turma', type: 'select', options: { ...funcionarioOptions, filter: (r) => !r.cargo || ['professor', 'coordenador', 'director'].includes(String(r.cargo)) } },
  { name: 'capacidade', label: 'Capacidade', type: 'number', default: 30, min: 1 },
]
const createFields: FieldDef[] = [
  comuns[0],
  { name: 'classe_id', label: 'Classe', type: 'select', options: classeOptions, required: true },
  ...comuns.slice(1),
]

function Atribuicoes({ t, onClose }: { t: Row; onClose: () => void }) {
  const q = useList(`/turmas/${t.id}/atribuicoes`)
  const [vals, setVals] = useState<Row>(() => initialValues(fields, {}))
  const atribuir = useAct((p: Row) => api.put(`/turmas/${t.id}/atribuicoes`, p), { invalidate: [`/turmas/${t.id}`], ok: 'Professor atribuído.', onDone: () => setVals(initialValues(fields, {})) })
  return (
    <Modal title={`Disciplinas e professores — ${pick(t, 'designacao')}`} size="lg" onClose={onClose}>
      {q.isLoading ? <Loading /> : (
        <Table
          rows={q.rows}
          pageSize={0}
          empty="Ainda não há disciplinas atribuídas a esta turma."
          cols={[
            { h: 'Disciplina', k: ['disciplina', 'disciplina_nome', 'disciplina.nome'] },
            { h: 'Professor', k: ['funcionario', 'professor', 'funcionario_nome', 'funcionario.nome_completo'] },
          ]}
        />
      )}
      <form
        style={{ marginTop: 16 }}
        onSubmit={(e) => { e.preventDefault(); atribuir.mutate(toPayload(fields, vals)) }}
      >
        <h4 style={{ margin: '0 0 8px' }}>Atribuir / substituir professor</h4>
        <FormFields fields={fields} values={vals} set={(n, v) => setVals((s) => ({ ...s, [n]: v }))} />
        <div className="form-f"><Btn type="submit" busy={atribuir.isPending}>Atribuir</Btn></div>
      </form>
    </Modal>
  )
}
const fields: FieldDef[] = [
  { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true },
  { name: 'funcionario_id', label: 'Professor', type: 'select', options: { ...funcionarioOptions, params: { cargo: 'professor' } }, required: true },
]

export default function Turmas() {
  const [at, setAt] = useState<Row | null>(null)
  return (
    <>
      <PageHead title="Turmas" sub="Turmas do ano lectivo activo, ocupação e professores por disciplina." />
      <Resource
        path="/turmas"
        search
        createLabel="Nova turma"
        createFields={createFields}
        editFields={comuns}
        editPath={(r) => `/turmas/${r.id}`}
        cols={[
          { h: 'Turma', k: ['designacao', 'nome'] },
          { h: 'Classe', k: ['classe', 'classe_designacao', 'classe.designacao'] },
          { h: 'Sala', k: ['sala', 'sala_designacao', 'sala.designacao'] },
          { h: 'Período', render: (r) => label(pick(r, 'periodo_dia')) },
          { h: 'Director de turma', k: ['director_turma', 'director_turma_nome', 'director_turma.nome_completo'] },
          {
            h: 'Ocupação',
            render: (r) => {
              const cap = num(pick(r, 'capacidade'))
              const n = pick(r, 'alunos', 'total_alunos', 'ocupacao', 'num_alunos', 'matriculados')
              if (n === undefined || typeof n === 'object') return cap ? `Capacidade ${cap}` : '—'
              const cheia = cap > 0 && num(n) >= cap
              return <>{num(n)}/{cap || '—'} <Tag tone={cheia ? 'er' : 'n'}>{cheia ? 'Cheia' : `Vagas: ${cap - num(n)}`}</Tag></>
            },
          },
        ]}
        rowActions={(r) => <Btn variant="link" onClick={() => setAt(r)}>Disciplinas</Btn>}
      />
      {at && <Atribuicoes t={at} onClose={() => setAt(null)} />}
    </>
  )
}

