import { useState } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { Table } from '@/components/Table'
import { Btn, Estado, PageHead, Select, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { hojeISO } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

export default function RegistoDiario() {
  const [turma, setTurma] = useState('')
  const [data, setData] = useState(hojeISO())
  const [novo, setNovo] = useState(false)
  const turmas = useList('/turmas')
  const alunos = useList(turma ? '/alunos' : null, { turma_id: turma, estado: 'activo', limit: 500 })
  const q = useList(turma ? '/registo-diario' : null, { turma_id: turma, data })
  const criar = useAct((p: Row) => api.post('/registo-diario', p), { invalidate: ['/registo-diario'], ok: 'Registo guardado.' })

  return (
    <>
      <PageHead title="Registo diário" sub="Comportamento e notas do dia por turma ou por aluno, visíveis na visão 360°."
        actions={<Btn disabled={!turma} onClick={() => setNovo(true)}>Novo registo</Btn>} />
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <input type="date" aria-label="Data" value={data} onChange={(e) => setData(e.target.value)} />
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} empty={turma ? 'Sem registos neste dia.' : 'Escolha uma turma.'} cols={[
        { h: 'Aluno', render: (r) => pick(r, 'aluno', 'aluno_nome', 'aluno.nome_completo') ?? 'Toda a turma' },
        { h: 'Comportamento', render: (r) => <Estado v={pick(r, 'comportamento')} /> },
        { h: 'Nota', k: ['nota_texto', 'nota'], nowrap: false },
      ]} />
      {novo && (
        <FormDialog title="Novo registo diário" onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync({ ...p, turma_id: Number(turma) })}
          fields={[
            { name: 'aluno_id', label: 'Aluno', type: 'select', empty: '— Toda a turma —', wide: true, options: alunos.rows.map((a) => ({ value: a.id, label: String(pick(a, 'nome_completo', 'nome')) })) },
            { name: 'data', label: 'Data', type: 'date', default: data },
            { name: 'comportamento', label: 'Comportamento', type: 'select', options: [{ value: 'bom', label: 'Bom' }, { value: 'regular', label: 'Regular' }, { value: 'atencao', label: 'Atenção' }] },
            { name: 'nota_texto', label: 'Nota', type: 'textarea' },
          ]} />
      )}
    </>
  )
}
