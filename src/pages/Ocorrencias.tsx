import { useState } from 'react'
import { Resource } from '@/components/Resource'
import { Estado, PageHead, Select, Tabs } from '@/components/ui'
import { alunoOptions } from '@/lib/academic'
import { pick } from '@/lib/data'
import { dataPT, hojeISO, label } from '@/lib/format'

export default function Ocorrencias() {
  const [tab, setTab] = useState<'lista' | 'tipos'>('lista')
  const [estado, setEstado] = useState('')
  return (
    <>
      <PageHead title="Ocorrências" sub="Registo disciplinar e positivo dos alunos, com acompanhamento e aviso ao encarregado." />
      <Tabs value={tab} onChange={setTab} tabs={[['lista', 'Ocorrências'], ['tipos', 'Tipos de ocorrência']]} />
      {tab === 'lista' && (
        <Resource
          path="/ocorrencias" params={{ estado }} search createLabel="Nova ocorrência"
          toolbar={<Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados" options={[{ value: 'aberta', label: 'Abertas' }, { value: 'em_acompanhamento', label: 'Em acompanhamento' }, { value: 'fechada', label: 'Fechadas' }]} />}
          createFields={[
            { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
            { name: 'tipo_id', label: 'Tipo', type: 'select', options: { path: '/tipos-ocorrencia', label: ['designacao'] }, required: true },
            { name: 'data', label: 'Data', type: 'date', default: hojeISO() },
            { name: 'descricao', label: 'Descrição', type: 'textarea', required: true },
            { name: 'accao_tomada', label: 'Acção tomada', type: 'textarea' },
            { name: 'notificar_ee', label: 'Aviso', type: 'checkbox', hint: 'Avisar o encarregado' },
          ]}
          editFields={[
            { name: 'estado', label: 'Estado', type: 'select', options: [{ value: 'aberta', label: 'Aberta' }, { value: 'em_acompanhamento', label: 'Em acompanhamento' }, { value: 'fechada', label: 'Fechada' }] },
            { name: 'accao_tomada', label: 'Acção tomada', type: 'textarea' },
          ]}
          editPath={(r) => `/ocorrencias/${r.id}`}
          deletePath={(r) => `/ocorrencias/${r.id}`} deleteName={() => 'esta ocorrência'}
          cols={[
            { h: 'Data', render: (r) => dataPT(pick(r, 'data')) },
            { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
            { h: 'Tipo', k: ['tipo', 'tipo_designacao', 'tipo.designacao'] },
            { h: 'Gravidade', render: (r) => { const g = pick(r, 'gravidade', 'tipo.gravidade'); return g ? <Estado v={g} /> : '—' } },
            { h: 'Descrição', k: 'descricao', nowrap: false },
            { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
          ]}
        />
      )}
      {tab === 'tipos' && (
        <Resource path="/tipos-ocorrencia" crud="/tipos-ocorrencia" createLabel="Novo tipo"
          createFields={[
            { name: 'designacao', label: 'Designação', required: true, wide: true },
            { name: 'gravidade', label: 'Gravidade', type: 'select', required: true, default: 'leve', options: ['positiva', 'leve', 'moderada', 'grave'].map((v) => ({ value: v, label: label(v) })) },
          ]}
          cols={[{ h: 'Tipo', k: 'designacao' }, { h: 'Gravidade', render: (r) => <Estado v={pick(r, 'gravidade')} /> }]} />
      )}
    </>
  )
}
