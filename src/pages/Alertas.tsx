import { useState } from 'react'
import { Table } from '@/components/Table'
import { Btn, Estado, PageHead, Select, Toolbar } from '@/components/ui'
import { pick } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { api } from '@/lib/api'
import { useAct, useList } from '@/lib/hooks'

export default function Alertas() {
  const [estado, setEstado] = useState('')
  const q = useList('/alertas', { estado })
  const gerar = useAct(() => api.post('/alertas/gerar'), { invalidate: ['/alertas', '/painel'], ok: (r) => `Alertas calculados${r?.novos !== undefined ? `: ${r.novos} novo(s)` : '.'}` })
  const tratar = useAct((v: { id: number; estado: string }) => api.patch(`/alertas/${v.id}`, { estado: v.estado }), { invalidate: ['/alertas', '/painel'], ok: 'Alerta actualizado.' })

  return (
    <>
      <PageHead
        title="Alertas"
        sub="Riscos de incumprimento, desempenho e divergências detectados automaticamente."
        actions={<Btn busy={gerar.isPending} onClick={() => gerar.mutate()}>Calcular alertas agora</Btn>}
      />
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados"
          options={[{ value: 'nova', label: 'Novos' }, { value: 'tratado', label: 'Tratados' }, { value: 'ignorado', label: 'Ignorados' }]} />
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        cols={[
          { h: 'Tipo', render: (r) => <Estado v={pick(r, 'gravidade', 'tipo', 'categoria')} text={String(pick(r, 'tipo', 'categoria', 'gravidade') ?? '')} /> },
          { h: 'Alerta', k: ['mensagem', 'descricao', 'titulo', 'texto'], nowrap: false },
          { h: 'Aluno', k: ['aluno_nome', 'aluno.nome_completo', 'aluno.nome', 'aluno'] },
          { h: 'Data', render: (r) => dataPT(pick(r, 'criado_em', 'data', 'created_at', 'gerado_em')) },
          { h: 'Estado', k: 'estado', estado: true },
          {
            h: '',
            render: (r) => (
              <span className="row-a">
                <Btn size="sm" variant="ghost" onClick={() => tratar.mutate({ id: r.id, estado: 'tratado' })}>Tratar</Btn>
                <Btn size="sm" variant="ghost" onClick={() => tratar.mutate({ id: r.id, estado: 'ignorado' })}>Ignorar</Btn>
              </span>
            ),
          },
        ]}
      />
    </>
  )
}
