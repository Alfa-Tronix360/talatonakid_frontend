import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Table } from '@/components/Table'
import { PageHead, SearchBox, Select, Toolbar } from '@/components/ui'
import { pick } from '@/lib/data'
import { useList } from '@/lib/hooks'
import { colunasAlunos } from './Alunos'

/** Lista de alunos no pedagógico: médias de cada trimestre e sinal de necessidades especiais (professores: só as suas turmas). */
export default function AlunosPedagogico() {
  const nav = useNavigate()
  const [turma, setTurma] = useState('')
  const [q, setQ] = useState('')
  const turmas = useList('/turmas')
  const lista = useList('/pedagogico/alunos', { turma_id: turma, q }, { keep: true })
  return (
    <>
      <PageHead title="Alunos" sub="Alunos das turmas, com a média de cada trimestre. ⚠ assinala necessidades especiais." />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Procurar aluno" />
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Todas as minhas turmas"
          options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
      </Toolbar>
      <Table
        rows={lista.rows}
        loading={lista.isLoading}
        error={lista.error}
        onRetry={() => lista.refetch()}
        onRow={(r) => nav(`/alunos/${r.id}`)}
        cols={colunasAlunos(lista.rows)}
        empty="Sem alunos nesta selecção."
      />
    </>
  )
}
