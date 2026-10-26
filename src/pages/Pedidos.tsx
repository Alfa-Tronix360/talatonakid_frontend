import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Table } from '@/components/Table'
import { Btn, Estado, PageHead, Select, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { turmaOptions } from '@/lib/academic'
import { type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

export const TIPOS_PEDIDO = [
  { value: 'vaga', label: 'Pedido de vaga' },
  { value: 'matricula', label: 'Matrícula' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'justificacao_falta', label: 'Justificação de falta' },
]
export const nomePedido = (t: unknown) => TIPOS_PEDIDO.find((x) => x.value === t)?.label ?? String(t ?? '')

const ESTADO_TOM: Record<string, string> = { pendente: 'pendente', aprovado: 'pago', rejeitado: 'divida', cancelado: 'anulada' }

/** Resumo do que o encarregado pediu, conforme o tipo. */
export function resumoPedido(p: Row) {
  const d = p.dados || {}
  switch (p.tipo) {
    case 'vaga': return `${d.nome_aluno}${d.data_nascimento ? `, nasc. ${dataPT(d.data_nascimento)}` : ''}`
    case 'transferencia': return `Para: ${d.escola_destino}`
    case 'declaracao': return `Finalidade: ${d.finalidade}`
    case 'justificacao_falta': return `Falta de ${dataPT(d.data)}: ${d.motivo}`
    default: return d.observacoes ?? ''
  }
}

export default function Pedidos() {
  const [sp] = useSearchParams()
  const [estado, setEstado] = useState(sp.get('estado') ?? 'pendente')
  const [tipo, setTipo] = useState('')
  const [decidir, setDecidir] = useState<{ p: Row; aprovar: boolean } | null>(null)
  const q = useList('/pedidos', { estado, tipo })
  const inv = ['/pedidos', '/alertas', '/alunos', '/matriculas', '/assiduidade']
  const acao = useAct((v: { p: Row; aprovar: boolean; corpo: Row }) => api.post(`/pedidos/${v.p.id}/${v.aprovar ? 'aprovar' : 'rejeitar'}`, v.corpo), {
    invalidate: inv, ok: (_, v) => (v.aprovar ? 'Pedido aprovado. O encarregado foi avisado.' : 'Pedido recusado. O encarregado foi avisado.'),
  })

  const campos = (p: Row, aprovar: boolean): FieldDef[] => [
    ...(aprovar && ['vaga', 'matricula'].includes(p.tipo)
      ? [{ name: 'turma_id', label: 'Turma', type: 'select', options: { ...turmaOptions, filter: (t: Row) => !p.dados?.classe_id || t.classe_id === p.dados.classe_id }, empty: 'Automática (1.ª turma da classe com vaga)', wide: true } as FieldDef]
      : []),
    { name: 'resposta', label: aprovar ? 'Mensagem para o encarregado (opcional)' : 'Motivo da recusa', type: 'textarea', required: !aprovar, wide: true },
  ]
  const efeito: Record<string, string> = {
    vaga: 'Aprovar cria o aluno, liga-o ao encarregado e matricula-o.',
    matricula: 'Aprovar matricula o educando no ano activo.',
    transferencia: 'Aprovar marca o aluno como transferido e anula a matrícula.',
    declaracao: 'Aprovar deixa a declaração disponível em PDF no portal do encarregado.',
    justificacao_falta: 'Aprovar passa as faltas injustificadas desse dia a justificadas.',
  }

  return (
    <>
      <PageHead title="Pedidos dos encarregados" sub="Vagas, matrículas, transferências, declarações e justificações de faltas feitas no portal. Aprovar executa o pedido." />
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados"
          options={[{ value: 'pendente', label: 'Por decidir' }, { value: 'aprovado', label: 'Aprovados' }, { value: 'rejeitado', label: 'Recusados' }, { value: 'cancelado', label: 'Cancelados' }]} />
        <Select label="Tipo" value={tipo} onChange={setTipo} placeholder="Todos os tipos" options={TIPOS_PEDIDO} />
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={estado === 'pendente' ? 'Não há pedidos por decidir.' : 'Sem pedidos nesta selecção.'}
        expand={(p) => (
          <div>
            {p.dados?.observacoes && <p style={{ margin: '0 0 6px' }}>Observações do encarregado: {p.dados.observacoes}</p>}
            {p.resposta && <p style={{ margin: '0 0 6px' }}>Resposta da escola: {p.resposta}</p>}
            {p.resultado?.turma && <p style={{ margin: 0 }}>Matriculado na turma <b>{p.resultado.turma}</b>.</p>}
            {p.resultado?.faltas_justificadas !== undefined && <p style={{ margin: 0 }}>{p.resultado.faltas_justificadas} falta(s) justificada(s).</p>}
            {!p.dados?.observacoes && !p.resposta && !p.resultado && <span className="mu">{efeito[p.tipo]}</span>}
          </div>
        )}
        cols={[
          { h: 'Data', render: (p) => dataPT(p.criado_em) },
          { h: 'Pedido', render: (p) => nomePedido(p.tipo) },
          { h: 'Encarregado', k: 'encarregado' },
          { h: 'Aluno', render: (p) => (p.aluno_id ? <Link to={`/alunos/${p.aluno_id}`} onClick={(e) => e.stopPropagation()}>{p.aluno}</Link> : p.aluno) },
          { h: 'Detalhe', render: (p) => resumoPedido(p), nowrap: false },
          { h: 'Estado', render: (p) => <Estado v={ESTADO_TOM[p.estado] ?? p.estado} text={p.estado === 'pendente' ? 'Por decidir' : String(p.estado).replace(/^./, (c: string) => c.toUpperCase())} /> },
          {
            h: '',
            render: (p) => p.estado === 'pendente' && (
              <span className="row-a" onClick={(e) => e.stopPropagation()}>
                <Btn size="sm" onClick={() => setDecidir({ p, aprovar: true })}>Aprovar</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setDecidir({ p, aprovar: false })}>Recusar</Btn>
              </span>
            ),
          },
        ]}
      />
      {decidir && (
        <FormDialog
          title={`${decidir.aprovar ? 'Aprovar' : 'Recusar'}: ${nomePedido(decidir.p.tipo)} — ${decidir.p.aluno ?? ''}`}
          size="sm"
          intro={decidir.aprovar ? efeito[decidir.p.tipo] : 'O encarregado recebe o motivo na app e por WhatsApp.'}
          submitLabel={decidir.aprovar ? 'Aprovar' : 'Recusar'}
          fields={campos(decidir.p, decidir.aprovar)}
          onClose={() => setDecidir(null)}
          onSubmit={(corpo) => acao.mutateAsync({ p: decidir.p, aprovar: decidir.aprovar, corpo })}
        />
      )}
    </>
  )
}
