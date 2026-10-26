import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useConfirm } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Estado, PageHead, Select, Toolbar } from '@/components/ui'
import { pick, type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { api } from '@/lib/api'
import { useAct, useList } from '@/lib/hooks'

export const TIPOS_ALERTA = [
  { value: 'comprovativo_pagamento', label: 'Comprovativos por verificar' },
  { value: 'pedido_encarregado', label: 'Pedidos dos encarregados' },
  { value: 'risco_incumprimento', label: 'Risco de incumprimento' },
  { value: 'queda_desempenho', label: 'Queda de desempenho' },
  { value: 'padrao_faltas', label: 'Faltas' },
  { value: 'comportamento', label: 'Comportamento' },
  { value: 'divergencia_primavera', label: 'Divergências Primavera' },
]
const TIPOS = TIPOS_ALERTA
export const nomeTipo = (t: unknown) => TIPOS.find((x) => x.value === t)?.label ?? String(t ?? '')

export default function Alertas() {
  const nav = useNavigate()
  const confirm = useConfirm()
  const [url] = useSearchParams() // o Painel abre já filtrado: /alertas?tipo=…&estado=novo
  const [estado, setEstado] = useState(url.get('estado') ?? '')
  const [tipo, setTipo] = useState(url.get('tipo') ?? '')
  const q = useList('/alertas', { estado, tipo })
  const inv = ['/alertas', '/painel', '/pagamentos', '/cobrancas']
  const gerar = useAct(() => api.post('/alertas/gerar'), { invalidate: ['/alertas', '/painel'], ok: (r) => `Alertas calculados${r?.novos !== undefined ? `: ${r.novos} novo(s)` : '.'}` })
  const tratar = useAct((v: { id: number; estado: string }) => api.patch(`/alertas/${v.id}`, { estado: v.estado }), { invalidate: ['/alertas', '/painel'], ok: 'Alerta actualizado.' })
  // Num comprovativo, decidir o pagamento fecha o alerta e avisa o encarregado (backend).
  const pagamento = useAct((v: { id: number; accao: 'confirmar' | 'rejeitar' }) => api.post(`/pagamentos/${v.id}/${v.accao}`), {
    invalidate: inv, ok: (_, v) => (v.accao === 'confirmar' ? 'Pagamento confirmado. O encarregado foi avisado.' : 'Pagamento rejeitado. O encarregado foi avisado.'),
  })

  const accoes = (r: Row) => {
    const aberto = ['novo', 'visto'].includes(String(r.estado))
    if (!aberto) return null
    if (r.tipo === 'comprovativo_pagamento' && r.dados?.pagamento_id) {
      const id = Number(r.dados.pagamento_id)
      return (
        <>
          <Btn size="sm" onClick={() => pagamento.mutate({ id, accao: 'confirmar' })}>Confirmar pagamento</Btn>
          <Btn size="sm" variant="ghost" onClick={async () => {
            if (await confirm({ title: 'Rejeitar pagamento', text: 'As cobranças voltam a ficar em dívida e o encarregado é avisado.', danger: true, yes: 'Rejeitar' })) pagamento.mutate({ id, accao: 'rejeitar' })
          }}>Rejeitar</Btn>
          <Btn size="sm" variant="link" onClick={() => nav('/pagamentos?estado=pendente')}>Ver comprovativo</Btn>
        </>
      )
    }
    if (r.tipo === 'pedido_encarregado') {
      return <Btn size="sm" onClick={() => nav('/pedidos?estado=pendente')}>Ver pedido</Btn>
    }
    return (
      <>
        <Btn size="sm" variant="ghost" onClick={() => tratar.mutate({ id: r.id, estado: 'tratado' })}>Tratar</Btn>
        <Btn size="sm" variant="ghost" onClick={() => tratar.mutate({ id: r.id, estado: 'descartado' })}>Descartar</Btn>
      </>
    )
  }

  return (
    <>
      <PageHead
        title="Alertas"
        sub="Comprovativos e pedidos por decidir, riscos de incumprimento, desempenho e divergências."
        actions={<Btn busy={gerar.isPending} onClick={() => gerar.mutate()}>Calcular alertas agora</Btn>}
      />
      <Toolbar>
        <Select label="Tipo" value={tipo} onChange={setTipo} placeholder="Todos os tipos" options={TIPOS} />
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados"
          options={[{ value: 'novo', label: 'Novos' }, { value: 'visto', label: 'Vistos' }, { value: 'tratado', label: 'Tratados' }, { value: 'descartado', label: 'Descartados' }]} />
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        cols={[
          { h: 'Tipo', render: (r) => <Estado v={pick(r, 'gravidade', 'tipo')} text={nomeTipo(r.tipo)} /> },
          { h: 'Alerta', k: ['mensagem', 'descricao', 'titulo', 'texto'], nowrap: false },
          { h: 'Aluno', k: ['aluno_nome', 'aluno.nome_completo', 'aluno.nome', 'aluno'] },
          { h: 'Data', render: (r) => dataPT(pick(r, 'criado_em', 'data', 'created_at', 'gerado_em')) },
          { h: 'Estado', k: 'estado', estado: true },
          { h: '', render: (r) => <span className="row-a" onClick={(e) => e.stopPropagation()}>{accoes(r)}</span> },
        ]}
      />
    </>
  )
}
