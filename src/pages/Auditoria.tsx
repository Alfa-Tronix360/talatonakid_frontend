import { useState } from 'react'
import { Table } from '@/components/Table'
import { PageHead, SearchBox, Toolbar } from '@/components/ui'
import { pick } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useList } from '@/lib/hooks'

export default function Auditoria() {
  const [tabela, setTabela] = useState('')
  const q = useList('/auditoria', { tabela_: tabela, limit: 300 })
  return (
    <>
      <PageHead title="Auditoria" sub="Registo de quem alterou o quê e quando." />
      <Toolbar><SearchBox value={tabela} onChange={setTabela} placeholder="Filtrar por tabela (ex.: alunos)" /></Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} pageSize={30} cols={[
        { h: 'Data', render: (r) => dataPT(pick(r, 'criado_em', 'data', 'created_at', 'quando'), true) },
        { h: 'Utilizador', k: ['utilizador', 'utilizador_nome', 'utilizador.nome', 'utilizador_id'] },
        { h: 'Acção', k: ['accao', 'operacao', 'acao'] },
        { h: 'Tabela', k: ['tabela', 'tabela_'] },
        { h: 'Registo', k: ['registo_id', 'entidade_id'] },
        { h: 'Detalhe', render: (r) => { const d = pick(r, 'detalhe', 'dados', 'depois', 'alteracoes'); return d === undefined ? '—' : <code>{typeof d === 'string' ? d : JSON.stringify(d).slice(0, 90)}</code> } },
      ]} />
    </>
  )
}
