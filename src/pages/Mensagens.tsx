import { useState } from 'react'
import { Resource } from '@/components/Resource'
import { Btn, Estado, PageHead, Select, Tabs } from '@/components/ui'
import { CANAIS, classeOptions, turmaOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { pick } from '@/lib/data'
import { dataPT, label } from '@/lib/format'
import { useAct } from '@/lib/hooks'

export default function Mensagens() {
  const [tab, setTab] = useState<'comunicados' | 'mensagens'>('comunicados')
  const [estado, setEstado] = useState('')
  // Criar um comunicado só põe as mensagens na fila (estado "agendada"); isto é o que as envia
  // de facto pelo canal (WhatsApp/SMS/e-mail). Antes só existia escondido na página Regras.
  const despachar = useAct(() => api.post('/mensagens/despachar'), {
    invalidate: ['/mensagens'],
    ok: (r: { enviadas: number; falhadas: number }) => `${r.enviadas} enviada(s)${r.falhadas ? `, ${r.falhadas} falhada(s)` : ''}.`,
  })
  return (
    <>
      <PageHead
        title="Mensagens e comunicados"
        sub="Comunicados à escola, a classes ou a turmas e histórico das mensagens enviadas aos encarregados."
        actions={<Btn variant="ghost" busy={despachar.isPending} onClick={() => despachar.mutate()}>Enviar mensagens em fila</Btn>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[['comunicados', 'Comunicados'], ['mensagens', 'Mensagens enviadas']]} />
      {tab === 'comunicados' && (
        <Resource
          path="/comunicados" createLabel="Novo comunicado"
          invalidate={['/comunicados', '/mensagens']}
          afterCreate={() => api.post('/mensagens/despachar').catch(() => { /* fica em fila; "Enviar mensagens em fila" trata disto */ })}
          createFields={[
            { name: 'titulo', label: 'Título', required: true, wide: true },
            { name: 'corpo', label: 'Mensagem', type: 'textarea', required: true },
            { name: 'alvo', label: 'Destinatários', type: 'select', required: true, default: 'todos', options: [{ value: 'todos', label: 'Toda a escola' }, { value: 'classe', label: 'Classes' }, { value: 'turma', label: 'Turmas' }] },
            { name: 'classe_ids', label: 'Classes', type: 'multi', options: classeOptions, showIf: (v) => v.alvo === 'classe' },
            { name: 'turma_ids', label: 'Turmas', type: 'multi', options: turmaOptions, showIf: (v) => v.alvo === 'turma' },
            { name: 'canais', label: 'Canais', type: 'multi', options: CANAIS, default: ['app'] },
          ]}
          cols={[
            { h: 'Data', render: (r) => dataPT(pick(r, 'criado_em', 'data', 'created_at'), true) },
            { h: 'Título', k: 'titulo' },
            { h: 'Destinatários', render: (r) => label(pick(r, 'alvo')) },
            { h: 'Mensagem', k: 'corpo', nowrap: false },
          ]}
        />
      )}
      {tab === 'mensagens' && (
        <Resource
          path="/mensagens" params={{ estado, limit: 300 }} search
          toolbar={<Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados" options={[{ value: 'agendada', label: 'Agendadas' }, { value: 'enviada', label: 'Enviadas' }, { value: 'falhada', label: 'Falhadas' }]} />}
          cols={[
            { h: 'Data', render: (r) => dataPT(pick(r, 'enviada_em', 'criado_em', 'data', 'created_at'), true) },
            { h: 'Encarregado', k: ['encarregado', 'encarregado_nome', 'encarregado.nome_completo'] },
            { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
            { h: 'Canal', render: (r) => label(pick(r, 'canal')) },
            { h: 'Mensagem', k: ['corpo', 'texto', 'assunto'], nowrap: false },
            {
              h: 'Estado',
              nowrap: false,
              render: (r) => {
                const erro = pick(r, 'erro')
                return (
                  <>
                    <Estado v={pick(r, 'estado')} />
                    {erro && <div className="mu" style={{ fontSize: 12, marginTop: 3 }}>{String(erro)}</div>}
                  </>
                )
              },
            },
          ]}
        />
      )}
    </>
  )
}
